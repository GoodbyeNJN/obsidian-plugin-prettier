import createIgnore from "ignore";
import pluginBabel from "prettier/plugins/babel";
import pluginEstree from "prettier/plugins/estree";
import pluginHtml from "prettier/plugins/html";
import pluginMarkdown from "prettier/plugins/markdown";
import pluginPostcss from "prettier/plugins/postcss";
import pluginTypescript from "prettier/plugins/typescript";
import pluginYaml from "prettier/plugins/yaml";
import prettier from "prettier/standalone";

import { MagicString } from "./utils/string";

import type PrettierPlugin from "./main";
import type { Settings } from "./model";
import type { Ignore } from "ignore";
import type { App, Editor, TFile } from "obsidian";
import type { Options } from "prettier";

const USE_PRETTIER_KEY = "prettier";
const USE_FAST_MODE_KEY = "prettier-fast-mode";

const REGEXP_UNORDERED_LIST_ITEMS_WITH_EXTRA_SPACES = /^[^\S\r\n]*[-*+][^\S\r\n]([^\S\r\n]+)/;
const REGEXP_EMPTY_LIST_ITEMS_WITHOUT_TRAILING_SPACES =
    /^((?:[^\S\r\n]*[-*+](?:[^\S\r\n]+\[.{1}\])?)|(?:[^\S\r\n]*\d+\.))$/;

export class Formatter {
    private app: App;
    private settings: Settings;
    private ignoreCache: Map<string, Ignore> = new Map();

    constructor(plugin: PrettierPlugin) {
        this.app = plugin.app;
        this.settings = plugin.settings;
    }

    async formatOnSave(editor: Editor, file: TFile | null) {
        if (!file || !this.settings.formatOnSave) return;

        await this.formatContent(editor, file);
    }

    async formatOnFileChange(file: TFile) {
        if (!this.settings.formatOnFileChange) return;

        await this.formatFile(file);
    }

    async formatFile(file: TFile) {
        if (!this.shouldUsePrettier(file)) return;

        const content = new MagicString(await file.vault.read(file));
        const options = this.getPrettierOptions(file);

        content.mutate(await prettier.format(content.original, options));

        if (this.settings.removeExtraSpaces) {
            this.removeExtraSpaces(content);
        }
        if (this.settings.addTrailingSpaces) {
            this.addTrailingSpaces(content);
        }

        if (!content.isModified) return;

        await file.vault.modify(file, content.current);
    }

    async formatContent(editor: Editor, file: TFile | null) {
        if (!file || !this.shouldUsePrettier(file)) return;

        const { left, top } = editor.getScrollInfo();

        const content = new MagicString(editor.getValue());
        const options = this.getPrettierOptions(file);

        let offset = -1;
        if (this.shouldUseFastMode(file)) {
            content.mutate(await prettier.format(content.original, options));
        } else {
            const result = await prettier.formatWithCursor(content.original, {
                cursorOffset: content.positionToOffset(editor.getCursor()),
                ...options,
            });
            content.mutate(result.formatted);
            offset = result.cursorOffset;
        }

        if (this.settings.removeExtraSpaces) {
            offset = this.removeExtraSpaces(content, offset);
        }
        if (this.settings.addTrailingSpaces) {
            offset = this.addTrailingSpaces(content, offset);
        }

        if (!content.isModified) return;

        editor.setValue(content.current);
        editor.scrollTo(left, top);

        if (offset !== -1) {
            editor.setCursor(content.offsetToPosition(offset));
        }
    }

    async formatSelection(editor: Editor, file: TFile | null) {
        if (!file || !this.shouldUsePrettier(file)) return;

        const content = new MagicString(editor.getSelection());
        const options = this.getPrettierOptions(file);

        content.mutate(await prettier.format(content.original, options));

        const isOriginalHasNewLine = content.original.endsWith("\n");
        const isModifiedHasNewLine = content.current.endsWith("\n");
        if (isOriginalHasNewLine && !isModifiedHasNewLine) {
            content.append("\n");
        } else if (!isOriginalHasNewLine && isModifiedHasNewLine) {
            content.delete(-1);
        }
        if (this.settings.removeExtraSpaces) {
            this.removeExtraSpaces(content);
        }
        if (this.settings.addTrailingSpaces) {
            this.addTrailingSpaces(content);
        }

        if (!content.isModified) return;

        editor.replaceSelection(content.current);
    }

    removeExtraSpaces(content: MagicString, offset = -1) {
        const matches = content.match<1>(REGEXP_UNORDERED_LIST_ITEMS_WITH_EXTRA_SPACES);

        let index = offset;
        for (const [remove] of matches.toReversed()) {
            index = content.delete(remove.start, remove.end, index);
        }

        return index;
    }

    addTrailingSpaces(content: MagicString, offset = -1) {
        const matches = content.match<1>(REGEXP_EMPTY_LIST_ITEMS_WITHOUT_TRAILING_SPACES);

        let index = offset;
        for (const [preserve] of matches.toReversed()) {
            index = content.insert(preserve.end, " ", index);
        }

        return index;
    }

    getPrettierOptions(file: TFile): Options {
        const language = pluginMarkdown.languages.find(({ extensions = [] }) =>
            extensions.includes(`.${file.extension}`),
        );
        const parser = language?.name === "MDX" ? "mdx" : "markdown";

        return {
            parser,
            plugins: [
                pluginBabel,
                pluginEstree,
                pluginHtml,
                pluginMarkdown,
                pluginPostcss,
                pluginTypescript,
                pluginYaml,
            ],
            ...this.settings.formatOptions,
            embeddedLanguageFormatting: this.settings.formatCodeBlock ? "auto" : "off",
        };
    }

    shouldUsePrettier(file: TFile) {
        const frontmatter = this.getFrontmatter(file);

        if (!Object.hasOwn(frontmatter, USE_PRETTIER_KEY)) {
            const ignore = this.createIgnore(this.settings.ignorePatterns);

            return !ignore.ignores(file.path);
        }

        return Boolean(frontmatter[USE_PRETTIER_KEY]);
    }

    shouldUseFastMode(file: TFile) {
        const frontmatter = this.getFrontmatter(file);

        return Boolean(frontmatter[USE_FAST_MODE_KEY]);
    }

    private getFrontmatter(file: TFile) {
        const metadata = this.app.metadataCache.getCache(file.path) || {};

        return metadata.frontmatter || {};
    }

    private createIgnore(patterns: string) {
        if (this.ignoreCache.has(patterns)) {
            return this.ignoreCache.get(patterns)!;
        }

        const ignore = createIgnore({ allowRelativePaths: true }).add(patterns);
        this.ignoreCache.set(patterns, ignore);

        return ignore;
    }
}
