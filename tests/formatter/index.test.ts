import fs from "node:fs";
import path from "node:path";

import fg from "fast-glob";

import { Formatter } from "@/formatter";
import { getDefaultSettings } from "@/model";
import { cursorOffsetToPosition, positionToCursorOffset } from "@/utils/cursor";

import type PrettierPlugin from "@/main";
import type { Settings } from "@/model";
import type { App, CachedMetadata, Editor, MetadataCache, TFile, Workspace } from "obsidian";

interface File {
    info: TFile;
    metadata: CachedMetadata;
    value: string;
}

const resolve = (...paths: string[]) => path.resolve(import.meta.dirname, ...paths);

const MockFile = vi.fn((filepath = "mock.md"): File => {
    const { base, ext, name } = path.parse(filepath);
    const info = {
        name: base,
        path: filepath,
        extension: ext.slice(1),
        basename: name,
    } satisfies Partial<TFile> as TFile;
    const metadata = { frontmatter: {} } satisfies Partial<CachedMetadata> as CachedMetadata;
    const value = "mock content";

    return { info, metadata, value };
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
    (file: File, settings: Partial<Settings> = {}) =>
        ({
            settings: { ...getDefaultSettings(), ...settings },
            app: {
                workspace: {
                    getActiveFile: () => file.info,
                } satisfies Partial<Workspace> as Workspace,
                metadataCache: {
                    getCache: (_path: string) => file.metadata,
                } satisfies Partial<MetadataCache> as MetadataCache,
            } satisfies Partial<App> as App,
        }) satisfies Partial<PrettierPlugin> as PrettierPlugin,
);

const prepare = async (filepath: string) => {
    const file = MockFile(filepath);
    file.value = await fs.promises.readFile(filepath, "utf-8");

    return file;
};

const removeCursor = (text: string) => [text.replace("│", ""), text.indexOf("│")] as const;

const insertCursor = (text: string, offset: number) =>
    text.slice(0, offset) + "│" + text.slice(offset);

const selectCursor = (text: string) => {
    const [removed, offset] = removeCursor(text);

    return [removed.slice(0, offset), removed.slice(offset)] as const;
};

describe.concurrent("Check if should format", () => {
    test.concurrent.for([
        { frontmatter: {}, expected: true },
        { frontmatter: { prettier: true }, expected: true },
        { frontmatter: { prettier: false }, expected: false },
    ])("With frontmatter: $frontmatter.prettier", ({ frontmatter, expected }, { expect }) => {
        const file = MockFile();
        file.metadata.frontmatter = frontmatter;
        const formatter = new Formatter(MockPrettierPlugin(file));

        expect(formatter.shouldUsePrettier()).toBe(expected);
    });

    test.concurrent.for([
        { settings: { ignorePatterns: "" }, expected: true },
        { settings: { ignorePatterns: "!config/*" }, expected: true },
        { settings: { ignorePatterns: "config/*" }, expected: false },
    ])("With ignore patterns: $settings.ignorePatterns", ({ settings, expected }, { expect }) => {
        const file = MockFile("config/test.md");
        const formatter = new Formatter(MockPrettierPlugin(file, settings));

        expect(formatter.shouldUsePrettier()).toBe(expected);
    });

    test.concurrent.for([
        {
            frontmatter: {},
            settings: { ignorePatterns: "config/*" },
            expected: false,
        },
        {
            frontmatter: {},
            settings: { ignorePatterns: "!config/*" },
            expected: true,
        },
        {
            frontmatter: { prettier: true },
            settings: { ignorePatterns: "config/*" },
            expected: true,
        },
        {
            frontmatter: { prettier: false },
            settings: { ignorePatterns: "!config/*" },
            expected: false,
        },
    ])(
        "With frontmatter: $frontmatter.prettier & patterns: $settings.ignorePatterns",
        ({ frontmatter, settings, expected }, { expect }) => {
            const file = MockFile("config/test.md");
            file.metadata.frontmatter = frontmatter;
            const formatter = new Formatter(MockPrettierPlugin(file, settings));

            expect(formatter.shouldUsePrettier()).toBe(expected);
        },
    );
});

describe.concurrent("Check if should use fast mode", () => {
    test.concurrent.for([
        { frontmatter: {}, expected: false },
        { frontmatter: { "prettier-fast-mode": true }, expected: true },
        { frontmatter: { "prettier-fast-mode": false }, expected: false },
    ])("With frontmatter: $frontmatter", ({ frontmatter, expected }, { expect }) => {
        const file = MockFile();
        file.metadata.frontmatter = frontmatter;
        const formatter = new Formatter(MockPrettierPlugin(file));

        expect(formatter.shouldUseFastMode()).toBe(expected);
    });
});

describe.concurrent("Check if should format on save", () => {
    test.concurrent.for([
        { settings: { formatOnSave: true }, expected: 1 },
        { settings: { formatOnSave: false }, expected: 0 },
    ])("With settings: $settings", ({ settings, expected }, { expect }) => {
        const formatter = new Formatter(MockPrettierPlugin(MockFile(), settings));

        formatter.formatContent = vi.fn();
        formatter.formatOnSave(MockEditor());
        expect(formatter.formatContent).toBeCalledTimes(expected);
    });
});

describe.concurrent("Get prettier options", () => {
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
    ])("With settings: $settings", ({ settings, expected }, { expect }) => {
        const formatter = new Formatter(MockPrettierPlugin(MockFile(), settings));

        expect(formatter.getPrettierOptions()).toMatchObject(expected);
    });
});

describe.concurrent("Get parser name from extension", () => {
    test.concurrent.for([
        { extension: "md", expected: "markdown" },
        { extension: "mdx", expected: "mdx" },
    ])("With extension: $extension", ({ extension, expected }, { expect }) => {
        const file = MockFile(`mock.${extension}`);
        const formatter = new Formatter(MockPrettierPlugin(file));

        expect(formatter.getParserName()).toBe(expected);
    });
});

test.concurrent("Assert fast mode is more quickly", async ({ expect }) => {
    const cwd = resolve("./fixtures/fast-mode");
    const file = await prepare(resolve(cwd, "input/long-content.md"));

    const formatter = new Formatter(MockPrettierPlugin(file));

    const result = [];
    for (const enable of [true, false]) {
        const setValue = vi.fn();
        const editor = MockEditor({
            getValue: () => file.value,
            setValue,
        });

        const start = performance.now();
        await (enable
            ? formatter.formatContentWithoutCursor(editor)
            : formatter.formatContentWithCursor(editor));
        const end = performance.now();

        const time = end - start;
        const output = setValue.mock.calls[0]?.[0] || file.value;

        result.push({ time, output });
    }
    const [fast, normal] = result;

    expect(fast!.time).toBeLessThan(normal!.time);
    expect(fast!.output).toEqual(normal!.output);
});

describe.concurrent("Format md and mdx files", async () => {
    const cwd = resolve("./fixtures/md-and-mdx");
    const files = await Promise.all(
        ["md.md", "mdx.mdx"].map(filename => resolve(cwd, "input", filename)).map(prepare),
    );

    test.concurrent.for(files)("With file: $info.name", async (file, { expect }) => {
        const setValue = vi.fn();
        const editor = MockEditor({
            getValue: () => file.value,
            setValue,
        });
        const formatter = new Formatter(
            MockPrettierPlugin(file, {
                addTrailingSpaces: true,
                removeExtraSpaces: true,
                formatCodeBlock: true,
            }),
        );

        await formatter.formatContent(editor);
        const output = setValue.mock.calls[0]?.[0] || file.value;

        expect(output).toMatchFileSnapshot(resolve(cwd, "output", file.info.name));
    });
});

describe.concurrent("Remove extra spaces", async () => {
    const cwd = resolve("./fixtures/remove-extra-spaces");
    const files = await Promise.all(
        ["no-cursor.md", "cursor-*.md"]
            .map(filename => resolve(cwd, "input", filename))
            .flatMap(pattern => fg.sync(pattern))
            .map(prepare),
    );

    const formatter = new Formatter(MockPrettierPlugin(MockFile()));

    test.concurrent.for(files)("With file: $info.name", async (file, { expect }) => {
        const noCursor = file.info.name.startsWith("no-cursor");

        let output = "";
        if (noCursor) {
            const [modified] = formatter.removeExtraSpaces(file.value);
            output = modified;
        } else {
            const [modified, offset] = formatter.removeExtraSpaces(...removeCursor(file.value));
            output = insertCursor(modified, offset);
        }

        expect(output).toMatchFileSnapshot(resolve(cwd, "output", file.info.name));
    });
});

describe.concurrent("Add trailing spaces", async () => {
    const cwd = resolve("./fixtures/add-trailing-spaces");
    const files = await Promise.all(
        ["no-cursor.md", "cursor-*.md"]
            .map(filename => resolve(cwd, "input", filename))
            .flatMap(pattern => fg.sync(pattern))
            .map(prepare),
    );

    const formatter = new Formatter(MockPrettierPlugin(MockFile()));

    test.concurrent.for(files)("With file: $info.name", async (file, { expect }) => {
        const noCursor = file.info.name.startsWith("no-cursor");

        let output = "";
        if (noCursor) {
            const [modified] = formatter.addTrailingSpaces(file.value);
            output = modified;
        } else {
            const [modified, offset] = formatter.addTrailingSpaces(...removeCursor(file.value));
            output = insertCursor(modified, offset);
        }

        expect(output).toMatchFileSnapshot(resolve(cwd, "output", file.info.name));
    });
});

describe.concurrent("Format selection", () => {
    const cwd = resolve("./fixtures/format-selection");

    test.concurrent("Should format selection with line break", async ({ expect }) => {
        const subCwd = `${cwd}/line-break`;
        const files = await Promise.all(fg.sync(`${subCwd}/input/cursor-*.md`).map(prepare));

        for (const file of files) {
            const [selection, rest] = selectCursor(file.value);
            const replaceSelection = vi.fn();

            const editor = MockEditor({
                getSelection: () => selection,
                replaceSelection,
            });
            const formatter = new Formatter(MockPrettierPlugin(file));

            await formatter.formatSelection(editor);
            const formatted = replaceSelection.mock.calls[0]?.[0] || selection;
            const output = formatted + rest;

            expect(output).toMatchFileSnapshot(resolve(subCwd, "output", file.info.name));
        }
    });

    test.concurrent("Should format selection with modify spaces", async ({ expect }) => {
        const subCwd = `${cwd}/modify-spaces`;
        const files = await Promise.all(fg.sync(`${subCwd}/input/cursor-*.md`).map(prepare));

        for (const file of files) {
            const [selection, rest] = selectCursor(file.value);
            const replaceSelection = vi.fn();

            const editor = MockEditor({
                getSelection: () => selection,
                replaceSelection,
            });
            const formatter = new Formatter(
                MockPrettierPlugin(file, {
                    formatOptions: { tabWidth: 4 },
                    removeExtraSpaces: true,
                    addTrailingSpaces: true,
                }),
            );

            await formatter.formatSelection(editor);
            const formatted = replaceSelection.mock.calls[0]?.[0] || selection;
            const output = formatted + rest;

            expect(output).toMatchFileSnapshot(resolve(subCwd, "output", file.info.name));
        }
    });
});

describe.concurrent("Format content", () => {
    const cwd = resolve("./fixtures/format-content");

    test.concurrent("Should format content with cursor", async ({ expect }) => {
        const subCwd = `${cwd}/cursor`;
        const files = await Promise.all(fg.sync(`${subCwd}/input/cursor-*.md`).map(prepare));

        for (const file of files) {
            const [value, offset] = removeCursor(file.value);
            const cursor = cursorOffsetToPosition(value, offset);
            const setValue = vi.fn();
            const setCursor = vi.fn();

            const editor = MockEditor({
                getValue: () => value,
                setValue,

                getCursor: () => cursor,
                setCursor,
            });
            const formatter = new Formatter(MockPrettierPlugin(file));

            await formatter.formatContent(editor);
            const formatted = setValue.mock.calls[0]?.[0] || value;
            const position = setCursor.mock.calls[0]?.[0] || cursor;
            const output = insertCursor(formatted, positionToCursorOffset(formatted, position));

            expect(output).toMatchFileSnapshot(resolve(subCwd, "output", file.info.name));
        }
    });

    test.concurrent("Should format content with modify spaces", async ({ expect }) => {
        const subCwd = `${cwd}/modify-spaces`;
        const files = await Promise.all(fg.sync(`${subCwd}/input/cursor-*.md`).map(prepare));

        for (const file of files) {
            const [value, offset] = removeCursor(file.value);
            const cursor = cursorOffsetToPosition(value, offset);
            const setValue = vi.fn();
            const setCursor = vi.fn();

            const editor = MockEditor({
                getValue: () => value,
                setValue,

                getCursor: () => cursor,
                setCursor,
            });
            const formatter = new Formatter(
                MockPrettierPlugin(file, {
                    formatOptions: { tabWidth: 4 },
                    removeExtraSpaces: true,
                    addTrailingSpaces: true,
                }),
            );

            await formatter.formatContent(editor);
            const formatted = setValue.mock.calls[0]?.[0] || value;
            const position = setCursor.mock.calls[0]?.[0] || cursor;
            const output = insertCursor(formatted, positionToCursorOffset(formatted, position));

            expect(output).toMatchFileSnapshot(resolve(subCwd, "output", file.info.name));
        }
    });
});
