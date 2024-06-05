import type PrettierPlugin from "./main";
import type { Settings } from "./model";
import type { App, Editor } from "obsidian";

export class Formatter {
    private app: App;
    private settings: Settings;

    constructor(plugin: PrettierPlugin) {
        this.app = plugin.app;
        this.settings = plugin.settings;
    }

    async formatOnSave(editor: Editor) {
        // TODO
    }

    async formatContent(editor: Editor) {
        // TODO
    }

    async formatSelection(editor: Editor) {
        // TODO
    }
}
