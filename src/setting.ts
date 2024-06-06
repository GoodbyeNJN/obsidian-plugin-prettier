import { PluginSettingTab, Setting, TextAreaComponent } from "obsidian";

import { fmt } from "./i18n";
import { getDefaultFormatOptions } from "./model";
import { createElement, createFragment } from "./utils";

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
                    this.display();
                }

                return result;
            },
        });
    }

    display() {
        const { containerEl } = this;

        containerEl.empty();

        this.addTitle(containerEl);
        this.addFormatOnSave(containerEl);
        this.addFormatCodeBlock(containerEl);
        this.addRemoveExtraSpaces(containerEl);
        this.addAddTrailingSpaces(containerEl);
        this.addFormatOptions(containerEl);
        this.addResetButton(containerEl);
    }

    private addTitle(containerEl: HTMLElement) {
        new Setting(containerEl).setName(fmt("setting:title")).setHeading();
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
        const valid = createElement(
            "span",
            {
                style: { color: "green" },
            },
            [fmt("setting:format-options-valid")],
        );
        const invalid = createElement(
            "span",
            {
                style: { color: "red" },
            },
            [fmt("setting:format-options-invalid")],
        );

        const setting = new Setting(containerEl).setName("Format options").setDesc(
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
        setting.controlEl.append(valid);

        new TextAreaComponent(containerEl).then(component => {
            component.inputEl.style.display = "block";
            component.inputEl.style.width = "100%";
            component.inputEl.style.height = "30em";
            component.inputEl.style.marginBottom = "0.75em";

            component.setValue(this.stringifyFormatOptions()).onChange(value => {
                const isValid = this.parseFormatOptions(value);
                setting.controlEl.replaceChildren(isValid ? valid : invalid);
            });
        });
    }

    private addResetButton(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName(fmt("setting:reset-options-name"))
            .setDesc(fmt("setting:reset-options-description"))
            .addButton(component =>
                component.setButtonText(fmt("setting:reset-options-button")).onClick(() => {
                    this.data.formatOptions = getDefaultFormatOptions();
                }),
            );
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
