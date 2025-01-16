import {
    ButtonComponent,
    PluginSettingTab,
    Setting,
    TextAreaComponent,
    TextComponent,
} from "obsidian";
import { omit } from "remeda";

import { fmt } from "./i18n";
import { getDefaultFormatOptions, getDefaultIgnorePatterns } from "./model";

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
                    plugin.saveSettings();
                }

                return result;
            },
        });
    }

    display() {
        this.containerEl.empty();

        this.addFormatOnSave();
        this.addFormatOnFileChange();
        this.addFormatCodeBlock();
        this.addRemoveExtraSpaces();
        this.addAddTrailingSpaces();
        this.addLanguageMappings();
        this.addFormatOptions();
        this.addIgnorePatterns();
    }

    private addFormatOnSave() {
        this.addToggleSetting(
            fmt("setting:format-on-save-name"),
            fmt("setting:format-on-save-description"),
            "formatOnSave",
        );
    }

    private addFormatOnFileChange() {
        this.addToggleSetting(
            fmt("setting:format-on-file-change-name"),
            fmt("setting:format-on-file-change-description"),
            "formatOnFileChange",
        );
    }

    private addFormatCodeBlock() {
        this.addToggleSetting(
            fmt("setting:format-code-block-name"),
            fmt("setting:format-code-block-description"),
            "formatCodeBlock",
        );
    }

    private addRemoveExtraSpaces() {
        this.addToggleSetting(
            fmt("setting:remove-extra-spaces-name"),
            fmt("setting:remove-extra-spaces-description"),
            "removeExtraSpaces",
        );
    }

    private addAddTrailingSpaces() {
        this.addToggleSetting(
            fmt("setting:add-trailing-spaces-name"),
            fmt("setting:add-trailing-spaces-description"),
            "addTrailingSpaces",
        );
    }

    private addLanguageMappings() {
        const addTextInput = (containerEl: HTMLElement) => {
            const input = new TextComponent(containerEl);

            const setValid = (isValid: boolean) => {
                if (isValid) {
                    input.inputEl.classList.remove("invalid");
                } else {
                    input.inputEl.classList.add("invalid");
                }

                return input;
            };

            input.inputEl.className = "prettier-settings__mapping-text";
            input.onChange(value => {
                setValid(value.length !== 0);
            });

            return Object.assign(input, { setValid });
        };

        const addMapping = (containerEl: HTMLElement) => {
            const container = containerEl.createDiv("prettier-settings__mapping");

            const from = addTextInput(container);
            container.createSpan({ text: "→", cls: "prettier-settings__mapping-symbol" });
            const to = addTextInput(container);

            const button = new ButtonComponent(container).setClass(
                "prettier-settings__mapping-button",
            );

            return { container, from, to, button };
        };

        new Setting(this.containerEl)
            .setName(fmt("setting:language-mappings-name"))
            .setDesc(fmt("setting:language-mappings-description"));

        const extra = this.containerEl.createDiv("setting-item-extra");

        const { container, from, to, button } = addMapping(extra);
        container.addClass("prettier-settings__mapping-header");
        button.setButtonText(fmt("setting:add-button-name")).onClick(() => {
            const fromValue = from.getValue();
            const toValue = to.getValue();
            if (fromValue.length === 0 || toValue.length === 0) {
                if (fromValue.length === 0) {
                    from.setValid(false);
                }
                if (toValue.length === 0) {
                    to.setValid(false);
                }
            } else {
                from.setValid(true);
                to.setValid(true);
                this.data.languageMappings = {
                    ...this.data.languageMappings,
                    [fromValue]: toValue,
                };
                this.display();
            }
        });

        for (const [k, v] of Object.entries(this.data.languageMappings)) {
            const { from, to, button } = addMapping(extra);

            from.setValue(k).setDisabled(true);
            to.setValue(v).setDisabled(true);
            button.setButtonText(fmt("setting:delete-button-name")).onClick(() => {
                this.data.languageMappings = omit(this.data.languageMappings, [k]);
                this.display();
            });
        }
    }

    private addFormatOptions() {
        this.addResetSetting(
            fmt("setting:format-options-name"),
            fmt("setting:format-options-description"),
            () => {
                this.data.formatOptions = getDefaultFormatOptions();
            },
        );

        this.addTextArea()
            .setValue(this.stringifyFormatOptions())
            .setValidator(value => this.parseFormatOptions(value));
    }

    private addIgnorePatterns() {
        this.addResetSetting(
            fmt("setting:ignore-patterns-name"),
            fmt("setting:ignore-patterns-description"),
            () => {
                this.data.ignorePatterns = getDefaultIgnorePatterns();
            },
        );

        this.addTextArea()
            .setValue(this.data.ignorePatterns)
            .onChange(value => {
                this.data.ignorePatterns = value;
            });
    }

    private addToggleSetting(
        name: string | DocumentFragment,
        description: string | DocumentFragment,
        key: { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings],
    ) {
        return new Setting(this.containerEl)
            .setName(name)
            .setDesc(description)
            .addToggle(component =>
                component.setValue(this.data[key]).onChange(value => {
                    this.data[key] = value;
                }),
            );
    }

    private addResetSetting(
        name: string | DocumentFragment,
        description: string | DocumentFragment,
        handler: () => void,
    ) {
        return new Setting(this.containerEl)
            .setName(name)
            .setDesc(description)
            .addButton(component => {
                component.setButtonText(fmt("setting:reset-button-name")).onClick(() => {
                    handler();
                    this.display();
                });
            });
    }

    private addTextArea() {
        const textArea = new TextAreaComponent(this.containerEl.createDiv("setting-item-extra"));

        let fn: (value: string) => boolean;
        const setValidator = (validator: typeof fn) => {
            fn = validator;
            return textArea;
        };

        const setValid = (isValid: boolean) => {
            if (isValid) {
                textArea.inputEl.classList.remove("invalid");
            } else {
                textArea.inputEl.classList.add("invalid");
            }

            return textArea;
        };

        textArea.inputEl.className = "prettier-settings__textarea";
        textArea.onChange(value => {
            setValid(fn?.(value) ?? true);
        });

        return Object.assign(textArea, { setValidator, setValid });
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
