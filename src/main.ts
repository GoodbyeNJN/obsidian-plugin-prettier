import { MarkdownView, Notice, Plugin } from "obsidian";

import { Formatter } from "./formatter";
import { fmt } from "./i18n";
import { getDefaultSettings } from "./model";
import { SettingsTab } from "./setting";
import { timer } from "./utils/common";

import type { Settings } from "./model";
import type { Command } from "obsidian";

export default class PrettierPlugin extends Plugin {
    settings: Settings = getDefaultSettings();

    private formatter!: Formatter;
    private originalSaveCallback: Command["callback"];

    async onload() {
        this.settings = { ...this.settings, ...(await this.loadData()) };
        this.formatter = new Formatter(this);

        this.registerCommand();
        this.hookSaveCommand();

        this.registerMenu();

        this.addSettingTab(new SettingsTab(this));
    }

    onunload() {
        this.unhookSaveCommand();
    }

    private registerCommand() {
        this.addCommand({
            id: "format-content",
            name: fmt("command:format-content-name"),
            editorCallback: async editor => {
                await this.withPerformanceNotice(() => this.formatter.formatContent(editor));
            },
        });

        this.addCommand({
            id: "format-selection",
            name: fmt("command:format-selection-name"),
            editorCheckCallback: (checking, editor) => {
                // TODO Check if the callback support async
                !checking &&
                    this.withPerformanceNotice(() => this.formatter.formatSelection(editor));

                return editor.somethingSelected();
            },
        });
    }

    private hookSaveCommand() {
        const saveCommand = this.app.commands.commands["editor:save-file"];
        const saveCallback = saveCommand?.callback;
        if (!saveCommand || !saveCallback) return;

        this.originalSaveCallback = saveCallback;
        saveCommand.callback = async () => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            view &&
                (await this.withPerformanceNotice(() => this.formatter.formatOnSave(view.editor)));

            await saveCallback();
        };
    }

    private unhookSaveCommand() {
        const saveCommand = this.app.commands.commands["editor:save-file"];
        if (!saveCommand || !this.originalSaveCallback) return;

        saveCommand.callback = this.originalSaveCallback;
    }

    private registerMenu() {
        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor) => {
                menu.addItem(item =>
                    item
                        .setTitle(fmt("command:format-content-name"))
                        .setIcon("paintbrush")
                        .onClick(async () => {
                            await this.formatter.formatContent(editor);
                        }),
                );

                editor.somethingSelected() &&
                    menu.addItem(item =>
                        item
                            .setTitle(fmt("command:format-selection-name"))
                            .setIcon("paintbrush")
                            .onClick(async () => {
                                await this.formatter.formatSelection(editor);
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
            const _notice = new Notice(
                `${fmt("notice:format-too-slow", 0)}${time.toFixed(2)}${fmt("notice:format-too-slow", 1)}`,
            );
        }
    }
}
