export interface Lang {
    "notice:format-too-slow": string[];
    "command:format-content-name": string;
    "command:format-selection-name": string;
    "setting:format-on-save-name": string;
    "setting:format-on-save-description": string;
    "setting:format-code-block-name": string;
    "setting:format-code-block-description": string;
    "setting:remove-extra-spaces-name": string;
    "setting:remove-extra-spaces-description": string[];
    "setting:add-trailing-spaces-name": string;
    "setting:add-trailing-spaces-description": string;
    "setting:format-options-name": string;
    "setting:format-options-description": string[];
    "setting:format-options-valid": string;
    "setting:format-options-invalid": string;
    "setting:reset-options-name": string;
    "setting:reset-options-description": string;
    "setting:reset-options-button": string;
}

type KeysMatching<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T];

export type SingleTextLangKey = KeysMatching<Lang, string>;
export type MultiTextLangKey = KeysMatching<Lang, string[]>;
