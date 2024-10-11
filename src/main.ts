import { MarkdownView, Notice, Plugin } from "obsidian";

import { Formatter } from "./formatter";
import { fmt } from "./i18n";
import { getDefaultSettings } from "./model";
import { SettingsTab } from "./setting";
import { timer } from "./utils/common";

import type { Settings } from "./model";
import type { Command, EventRef, TFile } from "obsidian";

export default class PrettierPlugin extends Plugin {
    settings: Settings = getDefaultSettings();

    private formatter!: Formatter;
    private lastActiveFile: TFile | null = null;
    private events: EventRef[] = [];
    private originalSaveCallback: Command["callback"];

    async onload() {
        this.settings = { ...this.settings, ...(await this.loadData()) };
        this.formatter = new Formatter(this);

        this.registerCommands();
        this.registerEvents();
        this.hookSaveCommands();

        this.registerMenu();

        this.addSettingTab(new SettingsTab(this));
    }

    onunload() {
        this.unregisterEvents();
        this.unhookSaveCommands();
    }

    private registerCommands() {
        this.addCommand({
            id: "format-content",
            name: fmt("command:format-content-name"),
            editorCallback: async (editor, view) => {
                await this.withPerformanceNotice(() =>
                    this.formatter.formatContent(editor, view.file),
                );
            },
        });

        this.addCommand({
            id: "format-selection",
            name: fmt("command:format-selection-name"),
            editorCheckCallback: (checking, editor, view) => {
                if (!checking) {
                    this.withPerformanceNotice(() =>
                        this.formatter.formatSelection(editor, view.file),
                    );
                }

                return editor.somethingSelected();
            },
        });
    }

    private registerEvents() {
        this.lastActiveFile = this.app.workspace.getActiveFile();

        this.events.push(
            this.app.workspace.on("active-leaf-change", async () => {
                const currentActiveFile = this.app.workspace.getActiveFile();

                const isLastActiveFileExists = this.app.vault.getFileByPath(
                    this.lastActiveFile?.path || "",
                );
                const isLastActiveMarkdownFile = ["md", "mdx"].includes(
                    this.lastActiveFile?.extension || "",
                );
                const isLastAndCurrentSame = this.lastActiveFile?.path === currentActiveFile?.path;
                if (
                    !this.lastActiveFile ||
                    !isLastActiveFileExists ||
                    !isLastActiveMarkdownFile ||
                    isLastAndCurrentSame
                ) {
                    this.lastActiveFile = currentActiveFile;

                    return;
                }

                await this.formatter.formatOnFileChange(this.lastActiveFile);
                this.lastActiveFile = currentActiveFile;
            }),
        );

        this.events.map(event => this.registerEvent(event));
    }

    private unregisterEvents() {
        this.events.map(event => this.app.workspace.offref(event));
    }

    private hookSaveCommands() {
        const saveCommand = this.app.commands.commands["editor:save-file"];
        const saveCallback = saveCommand?.callback;
        if (!saveCommand || !saveCallback) return;

        this.originalSaveCallback = saveCallback;
        saveCommand.callback = async () => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                await this.withPerformanceNotice(() =>
                    this.formatter.formatOnSave(view.editor, view.file),
                );
            }

            await saveCallback();
        };
    }

    private unhookSaveCommands() {
        const saveCommand = this.app.commands.commands["editor:save-file"];
        if (!saveCommand || !this.originalSaveCallback) return;

        saveCommand.callback = this.originalSaveCallback;
    }

    private registerMenu() {
        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor, view) => {
                menu.addItem(item =>
                    item
                        .setTitle(fmt("command:format-content-name"))
                        .setIcon("paintbrush")
                        .onClick(async () => {
                            await this.formatter.formatContent(editor, view.file);
                        }),
                );

                editor.somethingSelected() &&
                    menu.addItem(item =>
                        item
                            .setTitle(fmt("command:format-selection-name"))
                            .setIcon("paintbrush")
                            .onClick(async () => {
                                await this.formatter.formatSelection(editor, view.file);
                            }),
                    );
            }),
        );
    }

    private async withPerformanceNotice(fn: () => void | Promise<void>) {
        const stop = timer();

        await fn();

        const time = stop() / 1000;
        if (time > 5) {
            const _notice = new Notice(fmt("notice:format-too-slow", { time: time.toFixed(2) }));
        }
    }
}
