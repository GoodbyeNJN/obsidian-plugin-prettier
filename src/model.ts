import type { Options } from "prettier";

export interface Settings {
    formatOnSave: boolean;
    formatOnFileChange: boolean;
    formatCodeBlock: boolean;
    removeExtraSpaces: boolean;
    addTrailingSpaces: boolean;
    formatOptions: Options;
    ignorePatterns: string;
}

export const getDefaultFormatOptions = (): Options => ({
    trailingComma: "es5",
    tabWidth: 4,
    semi: false,
    singleQuote: true,
});

export const getDefaultIgnorePatterns = (): string =>
    `
**/.git
**/.svn
**/.hg
**/node_modules
`.trim();

export const getDefaultSettings = (): Settings => ({
    formatOnSave: false,
    formatOnFileChange: false,
    formatCodeBlock: false,
    removeExtraSpaces: false,
    addTrailingSpaces: false,
    formatOptions: getDefaultFormatOptions(),
    ignorePatterns: getDefaultIgnorePatterns(),
});
