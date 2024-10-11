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
    "command:format-content-name": "Format all content",
    "command:format-selection-name": "Format selected content",
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
    "setting:reset-button-name": "Reset",
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
} satisfies Lang;
