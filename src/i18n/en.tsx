/* eslint-disable no-template-curly-in-string */

import type { Lang } from "./types";

export const EN = {
    "notice:format-too-slow": {
        template:
            "Formatting took ${time} seconds, consider using fast mode or reducing the content.",
        placeholder: {
            time: "",
        },
    },
    "notice:load-settings-error": "Error loading plugin settings, please check the console logs.",
    "notice:register-plugin-error": "Error registering plugin, please check the console logs.",
    "command:format-content-name": "Format all content",
    "command:format-selection-name": "Format selected content",
    "setting:error-boundary-title": "Settings panel failed to load",
    "setting:error-boundary-description":
        "Error loading settings panel, please check the error message below.",
    "setting:format-on-save-name": "Format on save",
    "setting:format-on-save-description": "Format the current content when saving the file.",
    "setting:format-on-file-change-name": "Format on file change",
    "setting:format-on-file-change-description":
        "Format the last opened file when the file is closed or switched to another file.",
    "setting:format-code-block-name": "Format code blocks",
    "setting:format-code-block-description":
        "Include code blocks when formatting. Currently supports js(x), ts(x), css, scss, less, html, json, and yaml.",
    "setting:remove-extra-spaces-name": "Remove extra spaces",
    "setting:remove-extra-spaces-description": (
        <>
            Remove extra spaces after bullet points in unordered lists. See{" "}
            <a href="https://github.com/prettier/prettier/issues/4114">issues#4114</a> and{" "}
            <a href="https://github.com/prettier/prettier/issues/4281">issues#4281</a> for more
            details.
        </>
    ),
    "setting:add-trailing-spaces-name": "Add trailing spaces",
    "setting:add-trailing-spaces-description":
        "Add spaces at the end of empty list items to ensure correct rendering in live preview mode.",
    "setting:format-options-name": "Format options",
    "setting:format-options-description": (
        <>
            Formatting options passed to Prettier (in JSON format). See{" "}
            <a href="https://prettier.io/docs/en/configuration">Prettier documentation</a> for more
            details.
        </>
    ),
    "setting:ignore-patterns-name": "Ignore patterns",
    "setting:ignore-patterns-description": (
        <>
            List of glob patterns to ignore when formatting. If the current file has enabled or
            disabled formatting separately via frontmatter, this setting will be ignored. See{" "}
            <a href="https://prettier.io/docs/en/ignore#ignoring-files-prettierignore">
                Prettier documentation
            </a>{" "}
            for more details.
        </>
    ),
    "setting:language-mappings-name": "Code block language mappings",
    "setting:language-mappings-description": (
        <>
            Map code block languages from one to another. For example, after setting the mapping
            <code>dataviewjs → js</code>, Prettier will format all <code>dataviewjs</code> code
            blocks as <code>js</code>
            language.
        </>
    ),
    "setting:language-filter-name": "Code block language filter",
    "setting:language-filter-description": (
        <>
            Specify which code block languages to format using a whitelist or blacklist. For
            example, whitelist mode with <code>js</code> formats only <code>js</code> code blocks,
            while blacklist mode with <code>js</code> formats all code blocks except <code>js</code>
            . This filter applies before language mappings, e.g., whitelisting{" "}
            <code>dataviewjs</code> with a<code>dataviewjs → js</code> mapping will only format{" "}
            <code>dataviewjs</code> code blocks as <code>js</code>.
        </>
    ),
    "setting:language-filter-option-off": "Off",
    "setting:language-filter-option-whitelist": "Whitelist",
    "setting:language-filter-option-blacklist": "Blacklist",
    "setting:reset-button-name": "Reset",
    "setting:add-button-name": "Add",
    "setting:delete-button-name": "Delete",
} satisfies Lang;
