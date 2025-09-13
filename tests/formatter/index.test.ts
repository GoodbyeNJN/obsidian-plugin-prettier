import fs from "node:fs";
import path from "node:path";

import { globSync } from "tinyglobby";
import { isDefined } from "remeda";

import { Formatter } from "@/formatter";
import { getDefaultSettings } from "@/model";
import { MagicString } from "@/utils/string";

import type PrettierPlugin from "@/main";
import type { Settings } from "@/model";
import type { App, Editor, FrontMatterCache, MetadataCache, TFile, Vault } from "obsidian";
import type { Merge } from "type-fest";
import type { Mock } from "vitest";

type MockedObject<T> = Partial<{ [K in keyof T]: Mock }>;
type File = Merge<TFile, { content: string }>;

const MockFile = (filepath = "mock.md", content = "mock content") => {
    const { base, ext, name } = path.parse(filepath);

    return {
        name: base,
        path: filepath,
        extension: ext.slice(1),
        basename: name,
        content,
    } satisfies Partial<File> as File;
};

const MockPlugin = (init?: {
    frontmatter?: FrontMatterCache;
    settings?: Partial<Settings>;
    file?: File;
}) => {
    const { frontmatter, settings, file = MockFile() } = init || {};

    const metadataCache = {
        getCache: vi.fn(() => ({ frontmatter })),
    } satisfies MockedObject<MetadataCache> as unknown as MetadataCache;
    const vault = {
        read: vi.fn(() => file.content),
        modify: vi.fn(),
    } satisfies MockedObject<Vault> as unknown as Vault;

    return {
        settings: { ...getDefaultSettings(), ...settings },
        app: { metadataCache, vault } satisfies Partial<App> as App,
    } satisfies Partial<PrettierPlugin> as PrettierPlugin;
};

const MockEditor = {
    getValue: vi.fn(() => "mock content"),
    setValue: vi.fn(),

    getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
    setCursor: vi.fn(),

    getSelection: vi.fn(() => "mock selection"),
    replaceSelection: vi.fn(),

    getScrollInfo: vi.fn(() => ({ top: 0, left: 0 })),
    scrollTo: vi.fn(),
} satisfies MockedObject<Editor>;

const editor = MockEditor as unknown as Editor;

const CURSOR = "│";

const resolve = (...paths: string[]) => path.resolve(import.meta.dirname, ...paths);

const read = (filepath: string) => fs.promises.readFile(filepath, "utf-8");

const prepare = (...filepaths: string[]) =>
    Promise.all(
        filepaths
            .flatMap(pattern => globSync(pattern))
            .map(async filepath => {
                const { base, name } = path.parse(filepath);
                const content = new MagicString(await read(filepath));
                const [cursor] = content.find(CURSOR);

                content.replace(CURSOR, "");

                return { name, base, content, cursor };
            }),
    );

describe.concurrent("Should format", () => {
    test.concurrent.for([
        { enable: undefined, expected: true },
        { enable: true, expected: true },
        { enable: false, expected: false },
    ])("Prettier: $enable", ({ enable, expected }, { expect }) => {
        const formatter = new Formatter(
            MockPlugin({
                frontmatter: isDefined(enable) ? { prettier: enable } : enable,
            }),
        );

        expect(formatter.shouldUsePrettier(MockFile())).toEqual(expected);
    });

    test.concurrent.for([
        { ignorePatterns: "", expected: true },
        { ignorePatterns: "!config/*", expected: true },
        { ignorePatterns: "config/*", expected: false },
    ])("IgnorePatterns: $ignorePatterns", ({ ignorePatterns, expected }, { expect }) => {
        const formatter = new Formatter(
            MockPlugin({
                settings: { ignorePatterns },
            }),
        );

        expect(formatter.shouldUsePrettier(MockFile("config/test.md"))).toEqual(expected);
    });

    test.concurrent.for([
        {
            enable: undefined,
            ignorePatterns: "config/*",
            expected: false,
        },
        {
            enable: undefined,
            ignorePatterns: "!config/*",
            expected: true,
        },
        {
            enable: true,
            ignorePatterns: "config/*",
            expected: true,
        },
        {
            enable: false,
            ignorePatterns: "!config/*",
            expected: false,
        },
    ])("Prettier: $enable & IgnorePatterns: $ignorePatterns", (x, { expect }) => {
        const { enable, ignorePatterns, expected } = x;

        const formatter = new Formatter(
            MockPlugin({
                frontmatter: isDefined(enable) ? { prettier: enable } : enable,
                settings: { ignorePatterns },
            }),
        );

        expect(formatter.shouldUsePrettier(MockFile("config/test.md"))).toEqual(expected);
    });
});

describe.concurrent("Should use fast mode", () => {
    test.concurrent.for([
        { enable: undefined, expected: false },
        { enable: true, expected: true },
        { enable: false, expected: false },
    ])("FastMode: $enable", ({ enable, expected }, { expect }) => {
        const formatter = new Formatter(
            MockPlugin({
                frontmatter: isDefined(enable) ? { "prettier-fast-mode": enable } : enable,
            }),
        );

        expect(formatter.shouldUseFastMode(MockFile())).toEqual(expected);
    });
});

describe.concurrent("Should format on save", () => {
    test.concurrent.for([
        { formatOnSave: true, expected: 1 },
        { formatOnSave: false, expected: 0 },
    ])("FormatOnSave: $formatOnSave", ({ formatOnSave, expected }, { expect }) => {
        const formatter = new Formatter(
            MockPlugin({
                settings: { formatOnSave },
            }),
        );

        formatter.formatContent = vi.fn();
        formatter.formatOnSave(editor, MockFile());
        expect(formatter.formatContent).toBeCalledTimes(expected);
    });
});

describe.concurrent("Should format on file change", () => {
    test.concurrent.for([
        { formatOnFileChange: true, expected: 1 },
        { formatOnFileChange: false, expected: 0 },
    ])("FormatOnFileChange: $formatOnFileChange", (x, { expect }) => {
        const { formatOnFileChange, expected } = x;

        const formatter = new Formatter(
            MockPlugin({
                settings: { formatOnFileChange },
            }),
        );

        formatter.formatFile = vi.fn();
        formatter.formatOnFileChange(MockFile());
        expect(formatter.formatFile).toBeCalledTimes(expected);
    });
});

describe.concurrent("Prettier options", () => {
    test.concurrent.for([
        {
            settings: {
                formatOptions: { semi: true },
                formatCodeBlock: true,
            },
            expected: {
                semi: true,
                embeddedLanguageFormatting: "auto",
            },
        },
        {
            settings: {
                formatOptions: { singleQuote: false },
                formatCodeBlock: false,
            },
            expected: {
                singleQuote: false,
                embeddedLanguageFormatting: "off",
            },
        },
    ])("Prettier option case: %#", ({ settings, expected }, { expect }) => {
        const formatter = new Formatter(
            MockPlugin({
                settings,
            }),
        );

        expect(formatter.getPrettierOptions(MockFile())).toMatchObject(expected);
    });
});

describe.concurrent("Parser name", () => {
    test.concurrent.for([
        { extension: "md", expected: "markdown" },
        { extension: "mdx", expected: "mdx" },
    ])("Extension: $extension", ({ extension, expected }, { expect }) => {
        const formatter = new Formatter(MockPlugin());

        const { parser } = formatter.getPrettierOptions(MockFile(`mock.${extension}`));

        expect(parser).toEqual(expected);
    });
});

test.concurrent("Assert fast mode is more quickly", async ({ expect }) => {
    const cwd = resolve("./fixtures/fast-mode");
    const content = await read(resolve(cwd, "input/long-content.md"));

    const result = [];
    for (const enable of [true, false]) {
        vi.spyOn(editor, "getValue").mockReturnValue(content);

        const formatter = new Formatter(
            MockPlugin({
                frontmatter: { "prettier-fast-mode": enable },
            }),
        );

        const start = performance.now();
        await formatter.formatContent(editor, MockFile());

        const end = performance.now();

        const time = end - start;
        const output = MockEditor.setValue.mock.lastCall?.[0];

        result.push({ time, output });
    }
    const [fast, normal] = result;

    expect(fast!.time).toBeLessThan(normal!.time);
    expect(fast!.output).toEqual(normal!.output);
});

describe.concurrent("Format file", async () => {
    const cwd = resolve("./fixtures/md-and-mdx");
    const files = await prepare(
        ...["md.md", "mdx.mdx"].map(filename => resolve(cwd, "input", filename)),
    );

    test.concurrent.for(files)("Input file: $base", async ({ base, content }, { expect }) => {
        const file = MockFile(base, content.original);
        const plugin = MockPlugin({
            settings: {
                addTrailingSpaces: true,
                removeExtraSpaces: true,
                formatCodeBlock: true,
            },
            file,
        });

        const formatter = new Formatter(plugin);

        await formatter.formatFile(file);
        const output = (plugin.app.vault.modify as Mock).mock.lastCall?.[1];

        await expect(output).toMatchFileSnapshot(resolve(cwd, "output", base));
    });
});

describe.concurrent("Remove extra spaces", async () => {
    const cwd = resolve("./fixtures/remove-extra-spaces");
    const files = await prepare(
        ...["no-cursor.md", "cursor-*.md"].map(filename => resolve(cwd, "input", filename)),
    );

    const formatter = new Formatter(MockPlugin());

    test.concurrent.for(files)("Input file: $name", async (x, { expect }) => {
        const { base, name, content, cursor } = x;

        if (name.startsWith("no-cursor")) {
            formatter.removeExtraSpaces(content);
        } else {
            content.insert(formatter.removeExtraSpaces(content, cursor), CURSOR);
        }

        await expect(content.current).toMatchFileSnapshot(resolve(cwd, "output", base));
    });
});

describe.concurrent("Add trailing spaces", async () => {
    const cwd = resolve("./fixtures/add-trailing-spaces");
    const files = await prepare(
        ...["no-cursor.md", "cursor-*.md"].map(filename => resolve(cwd, "input", filename)),
    );

    const formatter = new Formatter(MockPlugin());

    test.concurrent.for(files)("Input file: $name", async (x, { expect }) => {
        const { base, name, content, cursor } = x;

        if (name.startsWith("no-cursor")) {
            formatter.addTrailingSpaces(content);
        } else {
            content.insert(formatter.addTrailingSpaces(content, cursor), CURSOR);
        }

        await expect(content.current).toMatchFileSnapshot(resolve(cwd, "output", base));
    });
});

describe.concurrent("Format content", () => {
    const cwd = resolve("./fixtures/format-content");

    test.concurrent("With cursor", async ({ expect }) => {
        const subCwd = `${cwd}/cursor`;
        const files = await prepare(`${subCwd}/input/cursor-*.md`);

        for (const { base, content, cursor } of files) {
            vi.spyOn(editor, "getValue").mockReturnValue(content.current);
            vi.spyOn(editor, "getCursor").mockReturnValue(content.offsetToPosition(cursor));

            const formatter = new Formatter(MockPlugin());

            await formatter.formatContent(editor, MockFile());
            const formatted = new MagicString(MockEditor.setValue.mock.lastCall?.[0]);
            const position = MockEditor.setCursor.mock.lastCall?.[0];
            formatted.insert(formatted.positionToOffset(position), CURSOR);

            await expect(formatted.current).toMatchFileSnapshot(resolve(subCwd, "output", base));
        }
    });

    test.concurrent("Modify spaces", async ({ expect }) => {
        const subCwd = `${cwd}/modify-spaces`;
        const files = await prepare(`${subCwd}/input/cursor-*.md`);

        for (const { base, content, cursor } of files) {
            vi.spyOn(editor, "getValue").mockReturnValue(content.current);
            vi.spyOn(editor, "getCursor").mockReturnValue(content.offsetToPosition(cursor));

            const formatter = new Formatter(
                MockPlugin({
                    settings: {
                        formatOptions: { tabWidth: 4 },
                        removeExtraSpaces: true,
                        addTrailingSpaces: true,
                    },
                }),
            );

            await formatter.formatContent(editor, MockFile());
            const formatted = new MagicString(MockEditor.setValue.mock.lastCall?.[0]);
            const position = MockEditor.setCursor.mock.lastCall?.[0];
            formatted.insert(formatted.positionToOffset(position), CURSOR);

            await expect(formatted.current).toMatchFileSnapshot(resolve(subCwd, "output", base));
        }
    });
});

describe.concurrent("Format selection", () => {
    const cwd = resolve("./fixtures/format-selection");

    test.concurrent("With line break", async ({ expect }) => {
        const subCwd = `${cwd}/line-break`;
        const files = await prepare(`${subCwd}/input/cursor-*.md`);

        for (const { base, content, cursor } of files) {
            const selection = content.clone();
            selection.slice(0, cursor);

            content.slice(cursor);

            vi.spyOn(editor, "getSelection").mockReturnValue(selection.current);

            const formatter = new Formatter(MockPlugin());

            await formatter.formatSelection(editor, MockFile());
            const formatted = MockEditor.replaceSelection.mock.lastCall?.[0];
            const output = formatted + content.current;

            await expect(output).toMatchFileSnapshot(resolve(subCwd, "output", base));
        }
    });

    test.concurrent("Modify spaces", async ({ expect }) => {
        const subCwd = `${cwd}/modify-spaces`;
        const files = await prepare(`${subCwd}/input/cursor-*.md`);

        for (const { base, content, cursor } of files) {
            const selection = content.clone();
            selection.slice(0, cursor);

            content.slice(cursor);

            vi.spyOn(editor, "getSelection").mockReturnValue(selection.current);

            const formatter = new Formatter(
                MockPlugin({
                    settings: {
                        formatOptions: { tabWidth: 4 },
                        removeExtraSpaces: true,
                        addTrailingSpaces: true,
                    },
                }),
            );

            await formatter.formatSelection(editor, MockFile());
            const formatted = MockEditor.replaceSelection.mock.lastCall?.[0];
            const output = formatted + content.current;

            await expect(output).toMatchFileSnapshot(resolve(subCwd, "output", base));
        }
    });
});
