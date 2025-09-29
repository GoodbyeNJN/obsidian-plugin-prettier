import type { JSX } from "jsx/jsx-runtime";

export type LangKey =
    | "notice:format-too-slow"
    | "notice:load-settings-error"
    | "notice:register-plugin-error"
    | "command:format-content-name"
    | "command:format-selection-name"
    | "setting:error-boundary-title"
    | "setting:error-boundary-description"
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
    | "setting:format-options-name"
    | "setting:format-options-description"
    | "setting:ignore-patterns-name"
    | "setting:ignore-patterns-description"
    | "setting:language-mappings-name"
    | "setting:language-mappings-description"
    | "setting:add-button-name"
    | "setting:delete-button-name"
    | "setting:reset-button-name";

export type LangValue =
    | string
    | { template: string; placeholder: Record<string, string> }
    | JSX.Element
    | ((props: Record<string, string>) => JSX.Element);

export type Lang = Record<LangKey, LangValue>;
