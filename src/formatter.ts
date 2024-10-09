import createIgnore from "ignore";
import pluginBabel from "prettier/plugins/babel";
import pluginEstree from "prettier/plugins/estree";
import pluginHtml from "prettier/plugins/html";
import pluginMarkdown from "prettier/plugins/markdown";
import pluginPostcss from "prettier/plugins/postcss";
import pluginTypescript from "prettier/plugins/typescript";
import pluginYaml from "prettier/plugins/yaml";
import prettier from "prettier/standalone";
import { isDefined } from "remeda";

import { cursorOffsetToPosition, positionToCursorOffset } from "./utils/cursor";

import type PrettierPlugin from "./main";
import type { Settings } from "./model";
import type { Ignore } from "ignore";
import type { App, Editor } from "obsidian";
import type { Options } from "prettier";

interface Match {
    text: string;
    start: number;
    end: number;
    length: number;
}

const USE_PRETTIER_KEY = "prettier";
const USE_FAST_MODE_KEY = "prettier-fast-mode";

const REGEXP_UNORDERED_LIST_ITEMS_WITH_EXTRA_SPACES = /^([^\S\r\n]*[-*+])([^\S\r\n]+)/;
const REGEXP_EMPTY_LIST_ITEMS_WITHOUT_TRAILING_SPACES =
    /^((?:[^\S\r\n]*[-*+](?:[^\S\r\n]+\[.{1}\])?)|(?:[^\S\r\n]*\d+\.))$/;

export class Formatter {
    private app: App;
    private settings: Settings;
    private ignoreInstanceCache: Map<string, Ignore> = new Map();

    constructor(plugin: PrettierPlugin) {
        this.app = plugin.app;
        this.settings = plugin.settings;
    }

    async formatOnSave(editor: Editor) {
        if (!this.settings.formatOnSave) return;

        await this.formatContent(editor);
    }

    async formatContent(editor: Editor) {
        if (!this.shouldUsePrettier()) return;

        if (this.shouldUseFastMode()) {
            await this.formatContentWithoutCursor(editor);
        } else {
            await this.formatContentWithCursor(editor);
        }
    }

    async formatContentWithCursor(editor: Editor) {
        const raw = editor.getValue();
        const cursor = editor.getCursor();
        const { left, top } = editor.getScrollInfo();

        const { formatted, cursorOffset } = await prettier.formatWithCursor(raw, {
            cursorOffset: positionToCursorOffset(raw, cursor),
            ...this.getPrettierOptions(),
        });

        let modified = formatted;
        let offset = cursorOffset;
        if (this.settings.removeExtraSpaces) {
            [modified, offset] = this.removeExtraSpaces(modified, offset);
        }
        if (this.settings.addTrailingSpaces) {
            [modified, offset] = this.addTrailingSpaces(modified, offset);
        }

        if (modified === raw) return;

        const position =
            modified === formatted
                ? cursorOffsetToPosition(formatted, cursorOffset)
                : cursorOffsetToPosition(modified, offset);

        editor.setValue(modified);
        editor.setCursor(position);
        editor.scrollTo(left, top);
    }

    async formatContentWithoutCursor(editor: Editor) {
        const raw = editor.getValue();
        const cursor = editor.getCursor();
        const { left, top } = editor.getScrollInfo();

        const formatted = await prettier.format(raw, this.getPrettierOptions());

        let modified = formatted;
        if (this.settings.removeExtraSpaces) {
            [modified] = this.removeExtraSpaces(modified);
        }
        if (this.settings.addTrailingSpaces) {
            [modified] = this.addTrailingSpaces(modified);
        }

        if (modified === raw) return;

        editor.setValue(modified);
        editor.setCursor(cursor);
        editor.scrollTo(left, top);
    }

    async formatSelection(editor: Editor) {
        if (!this.shouldUsePrettier()) return;

        const raw = editor.getSelection();

        const formatted = await prettier.format(raw, this.getPrettierOptions());

        let modified = formatted;
        if (raw.endsWith("\n") && !modified.endsWith("\n")) {
            modified += "\n";
        } else if (!raw.endsWith("\n") && modified.endsWith("\n")) {
            modified = modified.slice(0, -1);
        }
        if (this.settings.removeExtraSpaces) {
            [modified] = this.removeExtraSpaces(modified);
        }
        if (this.settings.addTrailingSpaces) {
            [modified] = this.addTrailingSpaces(modified);
        }

        if (modified === raw) return;

        editor.replaceSelection(modified);
    }

    removeExtraSpaces(text: string, cursorOffset = -1) {
        const matches = this.match(text, REGEXP_UNORDERED_LIST_ITEMS_WITH_EXTRA_SPACES) as [
            Match,
            Match,
        ][];

        let modified = text;
        let offset = cursorOffset;
        for (const match of matches.toReversed()) {
            const [preserve, remove] = match;

            if (offset <= remove.start) {
                // offset = offset;
            } else if (offset > remove.start && offset < remove.end) {
                offset = preserve.end + 1;
            } else if (offset >= remove.end) {
                offset = offset - remove.length + 1;
            }

            modified = modified.slice(0, remove.start) + ` ` + modified.slice(remove.end);
        }

        return [modified, offset] as const;
    }

    addTrailingSpaces(text: string, cursorOffset = -1) {
        const matches = this.match(text, REGEXP_EMPTY_LIST_ITEMS_WITHOUT_TRAILING_SPACES) as [
            Match,
        ][];

        let modified = text;
        let offset = cursorOffset;
        for (const match of matches.toReversed()) {
            const [preserve] = match;

            if (offset <= preserve.start) {
                // offset = offset;
            } else if (offset > preserve.start && offset < preserve.end) {
                // offset = offset;
            } else if (offset >= preserve.end) {
                offset += 1;
            }

            modified =
                modified.slice(0, preserve.start) +
                `${preserve.text} ` +
                modified.slice(preserve.end);
        }

        return [modified, offset] as const;
    }

    getPrettierOptions(): Options {
        return {
            parser: this.getParserName(),
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

    getParserName(): Options["parser"] {
        const { extension = "md" } = this.app.workspace.getActiveFile() || {};
        const language = pluginMarkdown.languages.find(({ extensions = [] }) =>
            extensions.includes(`.${extension}`),
        );

        return language?.name === "MDX" ? "mdx" : "markdown";
    }

    shouldUsePrettier() {
        const { path } = this.app.workspace.getActiveFile() || {};
        if (!path) return false;

        const metadata = this.app.metadataCache.getCache(path);
        const usePrettier = metadata?.frontmatter?.[USE_PRETTIER_KEY];
        if (isDefined(usePrettier)) return Boolean(usePrettier);

        const ignore = this.createIgnoreInstance(this.settings.ignorePatterns);

        return !ignore.ignores(path);
    }

    shouldUseFastMode() {
        const { path } = this.app.workspace.getActiveFile() || {};
        if (!path) return false;

        const metadata = this.app.metadataCache.getCache(path);
        const useFastMode = Boolean(metadata?.frontmatter?.[USE_FAST_MODE_KEY] ?? false);

        return useFastMode;
    }

    private createIgnoreInstance(patterns: string) {
        if (this.ignoreInstanceCache.has(patterns)) {
            return this.ignoreInstanceCache.get(patterns)!;
        }

        const ignore = createIgnore({ allowRelativePaths: true }).add(patterns);
        this.ignoreInstanceCache.set(patterns, ignore);

        return ignore;
    }

    private match(text: string, regexp: RegExp) {
        return [...text.matchAll(new RegExp(regexp, "dgm"))].map(match =>
            Array.from(match)
                .map((text, index) => ({
                    text,
                    indices: match.indices![index]!,
                }))
                .slice(1)
                .map<Match>(({ text, indices }) => ({
                    text,
                    start: indices[0],
                    end: indices[1],
                    length: text.length,
                })),
        );
    }
}
