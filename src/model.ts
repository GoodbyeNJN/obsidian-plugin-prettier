import type { Options } from "prettier";

export interface Settings {
    formatOnSave: boolean;
    formatCodeBlock: boolean;
    removeExtraSpaces: boolean;
    addTrailingSpaces: boolean;
    formatOptions: Options;
}

export const getDefaultFormatOptions = (): Options => ({
    trailingComma: "es5",
    tabWidth: 4,
    semi: false,
    singleQuote: true,
});

export const getDefaultSettings = (): Settings => ({
    formatOnSave: false,
    formatCodeBlock: false,
    removeExtraSpaces: false,
    addTrailingSpaces: false,
    formatOptions: getDefaultFormatOptions(),
});
