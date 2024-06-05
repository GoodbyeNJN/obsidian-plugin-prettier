import type { Lang } from "./types";

export const EN: Lang = {
    "command:format-content-name": "Format all content",
    "command:format-selection-name": "Format selected content",
    "setting:title": "Prettier",
    "setting:format-on-save-name": "Format on save",
    "setting:format-on-save-description": "Format the current content when saving the file.",
    "setting:format-code-block-name": "Format code blocks",
    "setting:format-code-block-description":
        "Include code blocks when formatting. Currently supports js(x), ts(x), css, scss, less, html, json, and yaml.",
    "setting:remove-extra-spaces-name": "Remove extra spaces",
    "setting:remove-extra-spaces-description": [
        "Remove extra spaces after bullet points in unordered lists. See ",
        "issues#4114",
        " and ",
        "issues#4281",
        " for more details.",
    ],
    "setting:add-trailing-spaces-name": "Add trailing spaces",
    "setting:add-trailing-spaces-description":
        "Add spaces at the end of empty list items to ensure correct rendering in live preview mode.",
    "setting:format-options-name": "Format options",
    "setting:format-options-description": [
        "Formatting options passed to Prettier (in JSON format). See ",
        "Prettier documentation",
        " for more details.",
    ],
    "setting:format-options-valid": "✔️ Valid",
    "setting:format-options-invalid": "❌ Invalid",
    "setting:reset-options-name": "Reset options",
    "setting:reset-options-description": "Reset to the default formatting options.",
    "setting:reset-options-button": "Reset",
};
