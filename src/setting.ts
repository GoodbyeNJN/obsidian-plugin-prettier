import { PluginSettingTab, Setting } from "obsidian";

import type PrettierPlugin from "./main";

export class SettingsTab extends PluginSettingTab {
    constructor(plugin: PrettierPlugin) {
        super(plugin.app, plugin);
    }

    display() {
        const { containerEl } = this;

        containerEl.empty();

        // TODO
        this.addTitle(containerEl);
    }

    private addTitle(containerEl: HTMLElement) {
        new Setting(containerEl).setName("Prettier").setHeading();
    }
}
