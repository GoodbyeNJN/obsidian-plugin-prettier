import type { JSX } from "jsx/jsx-runtime";

export type LangKey =
    | "notice:format-too-slow"
    | "command:format-content-name"
    | "command:format-selection-name"
    | "setting:format-on-save-name"
    | "setting:format-on-save-description"
    | "setting:format-on-file-change-name"
    | "setting:format-on-file-change-description"
    | "setting:format-code-block-name"
    | "setting:format-code-block-description"
    | "setting:remove-extra-spaces-name"
    | "setting:remove-extra-spaces-description"
    | "setting:add-trailing-spaces-name"
    | "setting:add-trailing-spaces-description"
    | "setting:reset-button-name"
    | "setting:format-options-name"
    | "setting:format-options-description"
    | "setting:ignore-patterns-name"
    | "setting:ignore-patterns-description";

export type LangValue =
    | string
    | { template: string; placeholder: Record<string, string> }
    | JSX.Element
    | ((props: Record<string, string>) => JSX.Element);

export type Lang = Record<LangKey, LangValue>;
