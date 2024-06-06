# obsidian-plugin-prettier

This is an [Obsidian](https://obsidian.md) plugin that uses [Prettier](https://prettier.io) to format notes.

The main inspiration comes from https://github.com/hipstersmoothie/obsidian-plugin-prettier. Since that repository is not actively maintained and does not declare an open source license, I have re-implemented its features and added some new features.

## Features

-   Multi language support, currently available in Simplified Chinese and English.
-   Supports Markdown and MDX formats.
-   Format the entire content or only the selected content.
-   Automatically format the content when saving the file.
-   Format embedded code blocks. Currently supports js(x), ts(x), css, scss, less, html, json, and yaml.
-   Optionally remove extra spaces in formatted list items. See related discussions [issues#4114](https://github.com/prettier/prettier/issues/4114) and [issues#4281](https://github.com/prettier/prettier/issues/4281).

    Example:

    ```md
    -   item 1
    -   item 2
    ```

    Formatted:

    ```md
    - item 1
    - item 2
    ```

-   Optionally add trailing spaces that are removed after formatting. This ensures correct rendering in live preview mode.

    Example:

    ```md
    -
    - [ ]
    ```

    Formatted:

    ```md
    - 
    - [ ] 
    ```

-   Configurable Prettier formatting options. See [Prettier documentation](https://prettier.io/docs/en/configuration) for details.

    Example:

    ```json
    {
        "trailingComma": "es5",
        "tabWidth": 4,
        "semi": false,
        "singleQuote": true
    }
    ```

-   Supports enabling or disabling formatting for the current file separately in frontmatter. Enabled by default when not set.

    Example:

    ```yaml
    ---
    prettier: false
    ---
    ```

## Commands and Menus

-   Format all content

    ID: `format-content`

    Hotkey: `None` (default)

-   Format selected content

    ID: `format-selection`

    Hotkey: `None` (default)

    Only available when some content is selected.

## Settings

-   Format on save

    Default: `false`

    Format the current content when saving the file.

-   Format code blocks

    Default: `false`

    Include code blocks when formatting. Currently supports js(x), ts(x), css, scss, less, html, json, and yaml.

-   Remove extra spaces

    Default: `false`

    Remove extra spaces after bullet points in unordered lists.

-   Add trailing spaces

    Default: `false`

    Add spaces at the end of empty list items to ensure correct rendering in live preview mode.

-   Format options

    Default:

    ```json
    {
        "trailingComma": "es5",
        "tabWidth": 4,
        "semi": false,
        "singleQuote": true
    }
    ```

    Formatting options passed to Prettier (in JSON format).

## Development

1.  Install dependencies:

    ```bash
    pnpm install
    ```

2.  Build the plugin:

    ```bash
    pnpm build
    ```

    The built files will be located in the `dist` directory.

3.  Load the plugin in Obsidian.

4.  You can also use the following command to watch for file changes and automatically build:

    ```bash
    pnpm dev
    ```

    If the `OBSIDIAN_VAULT_PATH` environment variable is set, the built files will also be automatically copied to the `$OBSIDIAN_VAULT_PATH/.obsidian/plugins/prettier-dev` directory.

    ```bash
    OBSIDIAN_VAULT_PATH=/path/to/your/vault pnpm dev
    ```

    Alternatively, copy `.env.example` to `.env` and modify the `OBSIDIAN_VAULT_PATH` value.

## License

MIT
