import { MarkdownView, Plugin } from "obsidian";

import { Formatter } from "./formatter";
import { fmt } from "./i18n";
import { getCurrentVersion, getDefaultSettings, migrate } from "./model";
import { SettingsTab } from "./setting";
import { logger, showNotice, withPerfNotice } from "./utils/common";

import type { Data } from "./model";
import type { Command, EventRef, TFile } from "obsidian";

export default class PrettierPlugin extends Plugin {
    settings = getDefaultSettings();

    private version = getCurrentVersion();
    private formatter!: Formatter;
    private lastActiveFile: TFile | null = null;
    private events: EventRef[] = [];
    private originalSaveCallback: Command["checkCallback"];

    override async onload() {
        logger("Loading plugin...");

        try {
            await this.loadSettings();
        } catch (error) {
            logger("Error loading plugin settings:", error);
            showNotice(fmt("notice:load-settings-error"));
        }

        this.formatter = new Formatter(this);

        try {
            try {
                const { formatContentCommand, formatSelectionCommand } = this.registerCommands();
                if (!formatContentCommand || !formatSelectionCommand) {
                    const missing = [];
                    if (!formatContentCommand) missing.push("format-content");
                    if (!formatSelectionCommand) missing.push("format-selection");

                    throw new Error(`Failed to register commands: ${missing.join(", ")}`);
                }
            } catch (error) {
                logger("Error registering commands:", error);
            }

            try {
                this.hookSaveCommands();
            } catch (error) {
                logger("Error hooking save commands:", error);
            }
        } catch {
            showNotice(fmt("notice:register-plugin-error"));
        }

        this.registerEvents();
        this.registerMenu();

        logger("Plugin loaded.");

        this.addSettingTab(new SettingsTab(this));
    }

    override onunload() {
        this.unregisterEvents();
        this.unhookSaveCommands();
    }

    async loadSettings() {
        const data = await this.loadData();
        const { settings } = migrate(data);

        this.settings = settings;
    }

    async saveSettings() {
        const data: Data = {
            version: this.version,
            settings: this.settings,
        };

        await this.saveData(data);
    }

    private registerCommands() {
        const formatContentCommand = this.addCommand({
            id: "format-content",
            name: fmt("command:format-content-name"),
            editorCallback: async (editor, view) => {
                await withPerfNotice(() => this.formatter.formatContent(editor, view.file));
            },
        });

        const formatSelectionCommand = this.addCommand({
            id: "format-selection",
            name: fmt("command:format-selection-name"),
            editorCheckCallback: (checking, editor, view) => {
                if (!checking) {
                    withPerfNotice(() => this.formatter.formatSelection(editor, view.file));
                }

                return editor.somethingSelected();
            },
        });

        return { formatContentCommand, formatSelectionCommand };
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
        const saveCallback = saveCommand?.checkCallback;
        if (!saveCommand || !saveCallback) return;

        this.originalSaveCallback = saveCallback;
        saveCommand.checkCallback = checking => {
            if (checking) return saveCallback(checking);

            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                withPerfNotice(() => this.formatter.formatOnSave(view.editor, view.file));
            }

            saveCallback(checking);
        };
    }

    private unhookSaveCommands() {
        const saveCommand = this.app.commands.commands["editor:save-file"];
        if (!saveCommand || !this.originalSaveCallback) return;

        saveCommand.checkCallback = this.originalSaveCallback;
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
}
