/* eslint-disable @typescript-eslint/unified-signatures */

import { isDefined, isFunction, isString } from "@goodbyenjn/utils/remeda";
import { moment } from "obsidian";

import { EN } from "./en";
import { ZH_CN } from "./zh-cn";

import type { LangKey } from "./types";
import type { JSX } from "jsx/jsx-runtime";

type Lang = typeof EN;

type StringLangKey = {
    [K in keyof Lang]: Lang[K] extends string ? K : never;
}[keyof Lang];

type FragmentLangKey = {
    [K in keyof Lang]: Lang[K] extends JSX.Element ? K : never;
}[keyof Lang];

type TemplateLangKey = {
    [K in keyof Lang]: Lang[K] extends { template: string } ? K : never;
}[keyof Lang];

type ComponentLangKey = {
    [K in keyof Lang]: Lang[K] extends (props: Record<string, string>) => JSX.Element ? K : never;
}[keyof Lang];

const maps: Record<string, Lang> = {
    en: EN,
    "zh-cn": ZH_CN,
};

interface Fmt {
    <T extends StringLangKey>(key: T): string;
    <T extends FragmentLangKey>(key: T): JSX.Fragment;
    <T extends TemplateLangKey>(key: T, placeholders: Lang[T]["placeholder"]): string;
    <T extends ComponentLangKey>(key: T, props: NonNullable<Parameters<Lang[T]>[0]>): JSX.Fragment;
}

export const fmt: Fmt = (key: LangKey, record?: unknown): any => {
    const locale = moment.locale();
    const lang = maps[locale] || EN;
    const value = lang[key];

    if (isString(value) || value instanceof DocumentFragment) {
        return value;
    } else if (value instanceof HTMLElement) {
        return <>{value}</>;
    }

    if (isFunction(value)) {
        if (!record) {
            throw new Error(`Props are required for key: ${key}.`);
        }

        const Component = value;
        const props = record as Record<string, string>;
        const element = <Component {...props} />;

        return element instanceof HTMLElement ? <>{element}</> : element;
    }

    if (!record) {
        throw new Error(`Placeholders are required for key: ${key}.`);
    }

    const { template } = value;
    const placeholders = record as Record<string, string>;

    return template.replace(/\${(\w+)}/g, (_, k) => {
        const v = placeholders[k];
        if (!isDefined(v)) {
            throw new Error(`Placeholder: ${k} is missing for key: ${key}.`);
        }

        return v;
    });
};
