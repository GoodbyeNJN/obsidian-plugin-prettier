import { ButtonComponent, PluginSettingTab, Setting, TextAreaComponent } from "obsidian";

import { fmt } from "./i18n";
import { getDefaultFormatOptions, getDefaultIgnorePatterns } from "./model";
import { createElement, createFragment } from "./utils/ui";

import type PrettierPlugin from "./main";
import type { Settings } from "./model";

export class SettingsTab extends PluginSettingTab {
    private data;

    constructor(plugin: PrettierPlugin) {
        super(plugin.app, plugin);

        this.data = new Proxy<Settings>(plugin.settings, {
            get: (target, key, receiver) => {
                return Reflect.get(target, key, receiver);
            },

            // eslint-disable-next-line max-params
            set: (target, key, value, receiver) => {
                const result = Reflect.set(target, key, value, receiver);
                if (result) {
                    plugin.saveData(target);
                }

                return result;
            },
        });
    }

    display() {
        const { containerEl } = this;

        containerEl.empty();

        this.addFormatOnSave(containerEl);
        this.addFormatCodeBlock(containerEl);
        this.addRemoveExtraSpaces(containerEl);
        this.addAddTrailingSpaces(containerEl);
        this.addFormatOptions(containerEl);
        this.addIgnorePatterns(containerEl);
    }

    private addFormatOnSave(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName(fmt("setting:format-on-save-name"))
            .setDesc(fmt("setting:format-on-save-description"))
            .addToggle(component =>
                component.setValue(this.data.formatOnSave).onChange(value => {
                    this.data.formatOnSave = value;
                }),
            );
    }

    private addFormatCodeBlock(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName(fmt("setting:format-code-block-name"))
            .setDesc(fmt("setting:format-code-block-description"))
            .addToggle(component =>
                component.setValue(this.data.formatCodeBlock).onChange(value => {
                    this.data.formatCodeBlock = value;
                }),
            );
    }

    private addRemoveExtraSpaces(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName(fmt("setting:remove-extra-spaces-name"))
            .setDesc(
                createFragment(
                    fmt("setting:remove-extra-spaces-description", 0),
                    createElement(
                        "a",
                        {
                            href: "https://github.com/prettier/prettier/issues/4114",
                        },
                        [fmt("setting:remove-extra-spaces-description", 1)],
                    ),
                    fmt("setting:remove-extra-spaces-description", 2),
                    createElement(
                        "a",
                        {
                            href: "https://github.com/prettier/prettier/issues/4281",
                        },
                        [fmt("setting:remove-extra-spaces-description", 3)],
                    ),
                    fmt("setting:remove-extra-spaces-description", 4),
                ),
            )
            .addToggle(component =>
                component.setValue(this.data.removeExtraSpaces).onChange(value => {
                    this.data.removeExtraSpaces = value;
                }),
            );
    }

    private addAddTrailingSpaces(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName(fmt("setting:add-trailing-spaces-name"))
            .setDesc(fmt("setting:add-trailing-spaces-description"))
            .addToggle(component =>
                component.setValue(this.data.addTrailingSpaces).onChange(value => {
                    this.data.addTrailingSpaces = value;
                }),
            );
    }

    private addFormatOptions(containerEl: HTMLElement) {
        const setting = new Setting(containerEl)
            .setName(fmt("setting:format-options-name"))
            .setDesc(
                createFragment(
                    fmt("setting:format-options-description", 0),
                    createElement(
                        "a",
                        {
                            href: "https://prettier.io/docs/en/configuration",
                        },
                        [fmt("setting:format-options-description", 1)],
                    ),
                    fmt("setting:format-options-description", 2),
                ),
            );

        new ButtonComponent(setting.controlEl)
            .setButtonText(fmt("setting:reset-button-name"))
            .onClick(() => {
                this.data.formatOptions = getDefaultFormatOptions();
                this.display();
            });

        new TextAreaComponent(containerEl).then(component => {
            component.inputEl.className = "prettier-settings__textarea";

            component.setValue(this.stringifyFormatOptions()).onChange(value => {
                const isValid = this.parseFormatOptions(value);

                if (isValid) {
                    component.inputEl.classList.remove("invalid");
                } else {
                    component.inputEl.classList.add("invalid");
                }
            });
        });
    }

    private addIgnorePatterns(containerEl: HTMLElement) {
        const setting = new Setting(containerEl)
            .setName(fmt("setting:ignore-patterns-name"))
            .setDesc(
                createFragment(
                    fmt("setting:ignore-patterns-description", 0),
                    createElement(
                        "a",
                        {
                            href: "https://prettier.io/docs/en/ignore#ignoring-files-prettierignore",
                        },
                        [fmt("setting:ignore-patterns-description", 1)],
                    ),
                    fmt("setting:ignore-patterns-description", 2),
                ),
            );

        new ButtonComponent(setting.controlEl)
            .setButtonText(fmt("setting:reset-button-name"))
            .onClick(() => {
                this.data.ignorePatterns = getDefaultIgnorePatterns();
                this.display();
            });

        new TextAreaComponent(containerEl).then(component => {
            component.inputEl.className = "prettier-settings__textarea";

            component.setValue(this.data.ignorePatterns).onChange(value => {
                this.data.ignorePatterns = value;
            });
        });
    }

    private stringifyFormatOptions() {
        return JSON.stringify(this.data.formatOptions, null, 2);
    }

    private parseFormatOptions(text: string) {
        try {
            this.data.formatOptions = JSON.parse(text);

            return true;
        } catch {
            return false;
        }
    }
}
