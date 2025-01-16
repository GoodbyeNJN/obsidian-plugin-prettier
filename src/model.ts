import { isNullish, isPlainObject } from "remeda";

import type { Options } from "prettier";
import type { ReadonlyTuple } from "type-fest";

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
    const { version } = manifest;
    const [major, minor, patch] = version.split(".").map(Number) as unknown as ReadonlyTuple<
        number,
        3
    >;

    return major * 10000 + minor * 100 + patch;
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
            version: 20000,
            settings: { ...dataV1, removeExtraSpaces: false },
        };

        return migrate(dataV2);
    }

    // 2.0.0
    return data as unknown as Data;
};
