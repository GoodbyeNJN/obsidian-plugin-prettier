import { Plugin } from "obsidian";

import { Formatter } from "./formatter";
import { getDefaultSettings } from "./model";
import { SettingsTab } from "./setting";

import type { Settings } from "./model";

export default class PrettierPlugin extends Plugin {
    settings: Settings = getDefaultSettings();

    private formatter!: Formatter;

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
        // TODO
    }

    private hookSaveCommand() {
        // TODO
    }

    private unhookSaveCommand() {
        // TODO
    }

    private registerMenu() {
        // TODO
    }
}
