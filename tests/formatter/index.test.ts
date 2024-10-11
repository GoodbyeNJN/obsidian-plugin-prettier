import fs from "node:fs";
import path from "node:path";

import fg from "fast-glob";
import { isDefined } from "remeda";

import { Formatter } from "@/formatter";
import { getDefaultSettings } from "@/model";
import { MagicString } from "@/utils/string";

import type PrettierPlugin from "@/main";
import type { Settings } from "@/model";
import type { App, Editor, FrontMatterCache, MetadataCache, TFile, Vault } from "obsidian";

const MockFile = vi.fn((filepath = "mock.md", io?: Pick<Vault, "read" | "modify">) => {
    const { base, ext, name } = path.parse(filepath);

    return {
        name: base,
        path: filepath,
        extension: ext.slice(1),
        basename: name,
        vault: (io || {
            read: async _ => "mock content",
            modify: async (..._) => {},
        }) satisfies Partial<Vault> as Vault,
    } satisfies Partial<TFile> as TFile;
});

const MockEditor = vi.fn(
    (init: Partial<Editor> = {}) =>
        ({
            getValue: vi.fn(() => "mock content"),
            setValue: vi.fn(),

            getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
            setCursor: vi.fn(),

            getSelection: vi.fn(() => "mock selection"),
            replaceSelection: vi.fn(),

            getScrollInfo: vi.fn(() => ({ top: 0, left: 0 })),
            scrollTo: vi.fn(),

            ...init,
        }) satisfies Partial<Editor> as Editor,
);

const MockPrettierPlugin = vi.fn(
    (frontmatter: FrontMatterCache = {}, settings: Partial<Settings> = {}) =>
        ({
            settings: { ...getDefaultSettings(), ...settings },
            app: {
                metadataCache: {
                    getCache: _ => ({ frontmatter }),
                } satisfies Partial<MetadataCache> as MetadataCache,
            } satisfies Partial<App> as App,
        }) satisfies Partial<PrettierPlugin> as PrettierPlugin,
);

const CURSOR = "│";

const resolve = (...paths: string[]) => path.resolve(import.meta.dirname, ...paths);

const read = (filepath: string) => fs.promises.readFile(filepath, "utf-8");

const prepare = (...filepaths: string[]) =>
    filepaths
        .flatMap(pattern => fg.sync(pattern))
        .map(async filepath => {
            const { base, name } = path.parse(filepath);
            const content = new MagicString(await read(filepath));

            return { name, base, content };
        });

const removeCursor = (text: MagicString) => {
    const offset = text.current.indexOf(CURSOR);

    text.mutate(text.current.replaceAll(CURSOR, ""));

    return offset;
};

const insertCursor = (text: MagicString, offset: number) => {
    text.insert(offset, CURSOR);
};

const selectCursor = (text: MagicString) => {
    const offset = removeCursor(text);

    return [text.current.slice(0, offset), text.current.slice(offset)] as const;
};

describe.concurrent("Should format", () => {
    test.concurrent.for([
        { enable: undefined, expected: true },
        { enable: true, expected: true },
        { enable: false, expected: false },
    ])("Prettier: $enable", ({ enable, expected }, { expect }) => {
        const formatter = new Formatter(
            MockPrettierPlugin(isDefined(enable) ? { prettier: enable } : enable),
        );

        expect(formatter.shouldUsePrettier(MockFile())).toEqual(expected);
    });

    test.concurrent.for([
        { ignorePatterns: "", expected: true },
        { ignorePatterns: "!config/*", expected: true },
        { ignorePatterns: "config/*", expected: false },
    ])("IgnorePatterns: $ignorePatterns", ({ ignorePatterns, expected }, { expect }) => {
        const formatter = new Formatter(MockPrettierPlugin({}, { ignorePatterns }));

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
    ])(
        "Prettier: $enable & IgnorePatterns: $ignorePatterns",
        ({ enable, ignorePatterns, expected }, { expect }) => {
            const formatter = new Formatter(
                MockPrettierPlugin(isDefined(enable) ? { prettier: enable } : enable, {
                    ignorePatterns,
                }),
            );

            expect(formatter.shouldUsePrettier(MockFile("config/test.md"))).toEqual(expected);
        },
    );
});

describe.concurrent("Should use fast mode", () => {
    test.concurrent.for([
        { enable: undefined, expected: false },
        { enable: true, expected: true },
        { enable: false, expected: false },
    ])("FastMode: $enable", ({ enable, expected }, { expect }) => {
        const formatter = new Formatter(
            MockPrettierPlugin(isDefined(enable) ? { "prettier-fast-mode": enable } : enable),
        );

        expect(formatter.shouldUseFastMode(MockFile())).toEqual(expected);
    });
});

describe.concurrent("Should format on save", () => {
    test.concurrent.for([
        { formatOnSave: true, expected: 1 },
        { formatOnSave: false, expected: 0 },
    ])("FormatOnSave: $formatOnSave", ({ formatOnSave, expected }, { expect }) => {
        const formatter = new Formatter(MockPrettierPlugin({}, { formatOnSave }));

        formatter.formatContent = vi.fn();
        formatter.formatOnSave(MockEditor(), MockFile());
        expect(formatter.formatContent).toBeCalledTimes(expected);
    });
});

describe.concurrent("Should format on file change", () => {
    test.concurrent.for([
        { formatOnFileChange: true, expected: 1 },
        { formatOnFileChange: false, expected: 0 },
    ])(
        "FormatOnFileChange: $formatOnFileChange",
        ({ formatOnFileChange, expected }, { expect }) => {
            const formatter = new Formatter(MockPrettierPlugin({}, { formatOnFileChange }));

            formatter.formatFile = vi.fn();
            formatter.formatOnFileChange(MockFile());
            expect(formatter.formatFile).toBeCalledTimes(expected);
        },
    );
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
        const formatter = new Formatter(MockPrettierPlugin({}, settings));

        expect(formatter.getPrettierOptions(MockFile())).toMatchObject(expected);
    });
});

describe.concurrent("Parser name", () => {
    test.concurrent.for([
        { extension: "md", expected: "markdown" },
        { extension: "mdx", expected: "mdx" },
    ])("Extension: $extension", ({ extension, expected }, { expect }) => {
        const formatter = new Formatter(MockPrettierPlugin());

        expect(formatter.getPrettierOptions(MockFile(`mock.${extension}`)).parser).toEqual(
            expected,
        );
    });
});

test.concurrent("Assert fast mode is more quickly", async ({ expect }) => {
    const cwd = resolve("./fixtures/fast-mode");
    const content = await read(resolve(cwd, "input/long-content.md"));

    const result = [];
    for (const enable of [true, false]) {
        const setValue = vi.fn();
        const editor = MockEditor({
            getValue: () => content,
            setValue,
        });

        const formatter = new Formatter(MockPrettierPlugin({ "prettier-fast-mode": enable }));

        const start = performance.now();
        await formatter.formatContent(editor, MockFile());

        const end = performance.now();

        const time = end - start;
        const output = setValue.mock.calls[0]?.[0] || content;

        result.push({ time, output });
    }
    const [fast, normal] = result;

    expect(fast!.time).toBeLessThan(normal!.time);
    expect(fast!.output).toEqual(normal!.output);
});

describe.concurrent("Format file", async () => {
    const cwd = resolve("./fixtures/md-and-mdx");
    const files = await Promise.all(
        prepare(...["md.md", "mdx.mdx"].map(filename => resolve(cwd, "input", filename))),
    );

    test.concurrent.for(files)("Input file: $base", async ({ base, content }, { expect }) => {
        const read = vi.fn(async _ => content.original);
        const modify = vi.fn();

        const formatter = new Formatter(
            MockPrettierPlugin(
                {},
                {
                    addTrailingSpaces: true,
                    removeExtraSpaces: true,
                    formatCodeBlock: true,
                },
            ),
        );

        await formatter.formatFile(MockFile(base, { read, modify }));
        const output = modify.mock.calls[0]?.[1] || content.original;

        expect(output).toMatchFileSnapshot(resolve(cwd, "output", base));
    });
});

describe.concurrent("Remove extra spaces", async () => {
    const cwd = resolve("./fixtures/remove-extra-spaces");
    const files = await Promise.all(
        prepare(
            ...["no-cursor.md", "cursor-*.md"].map(filename => resolve(cwd, "input", filename)),
        ),
    );

    const formatter = new Formatter(MockPrettierPlugin());

    test.concurrent.for(files)("Input file: $name", async ({ base, name, content }, { expect }) => {
        if (name.startsWith("no-cursor")) {
            formatter.removeExtraSpaces(content);
        } else {
            const offset = formatter.removeExtraSpaces(content, removeCursor(content));
            insertCursor(content, offset);
        }

        expect(content.current).toMatchFileSnapshot(resolve(cwd, "output", base));
    });
});

describe.concurrent("Add trailing spaces", async () => {
    const cwd = resolve("./fixtures/add-trailing-spaces");
    const files = await Promise.all(
        prepare(
            ...["no-cursor.md", "cursor-*.md"].map(filename => resolve(cwd, "input", filename)),
        ),
    );

    const formatter = new Formatter(MockPrettierPlugin());

    test.concurrent.for(files)("Input file: $name", async ({ base, name, content }, { expect }) => {
        if (name.startsWith("no-cursor")) {
            formatter.addTrailingSpaces(content);
        } else {
            const offset = formatter.addTrailingSpaces(content, removeCursor(content));
            insertCursor(content, offset);
        }

        expect(content.current).toMatchFileSnapshot(resolve(cwd, "output", base));
    });
});

describe.concurrent("Format content", () => {
    const cwd = resolve("./fixtures/format-content");

    test.concurrent("With cursor", async ({ expect }) => {
        const subCwd = `${cwd}/cursor`;
        const files = await Promise.all(prepare(`${subCwd}/input/cursor-*.md`));

        for (const { base, content } of files) {
            const cursor = content.offsetToPosition(removeCursor(content));
            const setValue = vi.fn();
            const setCursor = vi.fn();

            const editor = MockEditor({
                getValue: () => content.current,
                setValue,

                getCursor: () => cursor,
                setCursor,
            });
            const formatter = new Formatter(MockPrettierPlugin());

            await formatter.formatContent(editor, MockFile());
            const formatted = new MagicString(setValue.mock.calls[0]?.[0] || content.current);
            const position = setCursor.mock.calls[0]?.[0] || cursor;
            insertCursor(formatted, formatted.positionToOffset(position));

            expect(formatted.current).toMatchFileSnapshot(resolve(subCwd, "output", base));
        }
    });

    test.concurrent("Modify spaces", async ({ expect }) => {
        const subCwd = `${cwd}/modify-spaces`;
        const files = await Promise.all(prepare(`${subCwd}/input/cursor-*.md`));

        for (const { base, content } of files) {
            const cursor = content.offsetToPosition(removeCursor(content));
            const setValue = vi.fn();
            const setCursor = vi.fn();

            const editor = MockEditor({
                getValue: () => content.current,
                setValue,

                getCursor: () => cursor,
                setCursor,
            });
            const formatter = new Formatter(
                MockPrettierPlugin(
                    {},
                    {
                        formatOptions: { tabWidth: 4 },
                        removeExtraSpaces: true,
                        addTrailingSpaces: true,
                    },
                ),
            );

            await formatter.formatContent(editor, MockFile());
            const formatted = new MagicString(setValue.mock.calls[0]?.[0] || content.current);
            const position = setCursor.mock.calls[0]?.[0] || cursor;
            insertCursor(formatted, formatted.positionToOffset(position));

            expect(formatted.current).toMatchFileSnapshot(resolve(subCwd, "output", base));
        }
    });
});

describe.concurrent("Format selection", () => {
    const cwd = resolve("./fixtures/format-selection");

    test.concurrent("With line break", async ({ expect }) => {
        const subCwd = `${cwd}/line-break`;
        const files = await Promise.all(prepare(`${subCwd}/input/cursor-*.md`));

        for (const { base, content } of files) {
            const [selection, rest] = selectCursor(content);
            const replaceSelection = vi.fn();

            const editor = MockEditor({
                getSelection: () => selection,
                replaceSelection,
            });
            const formatter = new Formatter(MockPrettierPlugin());

            await formatter.formatSelection(editor, MockFile());
            const formatted = replaceSelection.mock.calls[0]?.[0] || selection;
            const output = formatted + rest;

            expect(output).toMatchFileSnapshot(resolve(subCwd, "output", base));
        }
    });

    test.concurrent("Modify spaces", async ({ expect }) => {
        const subCwd = `${cwd}/modify-spaces`;
        const files = await Promise.all(prepare(`${subCwd}/input/cursor-*.md`));

        for (const { base, content } of files) {
            const [selection, rest] = selectCursor(content);
            const replaceSelection = vi.fn();

            const editor = MockEditor({
                getSelection: () => selection,
                replaceSelection,
            });
            const formatter = new Formatter(
                MockPrettierPlugin(
                    {},
                    {
                        formatOptions: { tabWidth: 4 },
                        removeExtraSpaces: true,
                        addTrailingSpaces: true,
                    },
                ),
            );

            await formatter.formatSelection(editor, MockFile());
            const formatted = replaceSelection.mock.calls[0]?.[0] || selection;
            const output = formatted + rest;

            expect(output).toMatchFileSnapshot(resolve(subCwd, "output", base));
        }
    });
});
