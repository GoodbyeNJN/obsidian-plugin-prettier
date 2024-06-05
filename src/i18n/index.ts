import { moment } from "obsidian";

import { EN } from "./en";
import { ZH_CN } from "./zh-cn";

import type { Lang, MultiTextLangKey, SingleTextLangKey } from "./types";

const maps: Record<string, Lang> = {
    en: EN,
    "zh-cn": ZH_CN,
};

interface Fmt {
    (key: SingleTextLangKey): string;
    (key: MultiTextLangKey, index: number): string;
}

export const fmt: Fmt = (key, index?) => {
    const locale = moment.locale();
    const lang = maps[locale] || EN;
    const text = lang[key];

    if (!Array.isArray(text)) {
        return text;
    }

    if (!Number.isNumber(index)) {
        throw new Error("Index must be provided as a number for multi-text key.");
    }

    const value = text[index];
    if (value === undefined) {
        throw new Error(`Index ${index} is out of range for key ${key}.`);
    }

    return value;
};
