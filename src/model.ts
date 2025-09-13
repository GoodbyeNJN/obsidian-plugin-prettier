import { isNullish, isPlainObject } from "@goodbyenjn/utils/remeda";

import { versionStrToNum } from "./utils/version";

import type { Options } from "prettier";

export interface Data {
    version: number;
    settings: Settings;
}

export interface Settings {
    formatOnSave: boolean;
    formatOnFileChange: boolean;
    formatCodeBlock: boolean;
    removeExtraSpaces: boolean;
    addTrailingSpaces: boolean;
    languageMappings: Record<string, string>;
    formatOptions: Options;
    ignorePatterns: string;
}

const manifest = process.env.MANIFEST;

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

export const getCurrentVersion = () => {
    const version = versionStrToNum(manifest.version);

    return version;
};

export const getDefaultSettings = (): Settings => ({
    formatOnSave: false,
    formatOnFileChange: false,
    formatCodeBlock: false,
    removeExtraSpaces: false,
    addTrailingSpaces: false,
    languageMappings: {},
    formatOptions: getDefaultFormatOptions(),
    ignorePatterns: getDefaultIgnorePatterns(),
});

export const migrate = (data: unknown): Data => {
    // New user
    if (isNullish(data) || !isPlainObject(data)) {
        return {
            version: getCurrentVersion(),
            settings: getDefaultSettings(),
        };
    }

    // 1.x.x -> 2.0.0
    if (!Object.hasOwn(data, "version")) {
        const dataV1 = data as unknown as Settings;
        const dataV2: Data = {
            version: versionStrToNum("2.0.0"),
            settings: { ...dataV1, removeExtraSpaces: false },
        };

        return migrate(dataV2);
    }

    // 2.0.0 -> 2.0.1
    if (data.version === versionStrToNum("2.0.0")) {
        const dataV2 = data as unknown as Data;
        const dataV2_0_1: Data = {
            version: versionStrToNum("2.0.1"),
            settings: {
                // @ts-expect-error
                languageMappings: {},
                ...dataV2.settings,
            },
        };

        return migrate(dataV2_0_1);
    }

    // 2.0.1
    return data as unknown as Data;
};
