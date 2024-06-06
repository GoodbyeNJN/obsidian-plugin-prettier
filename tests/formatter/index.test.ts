import fs from "node:fs";
import path from "node:path";

import { Formatter } from "@/formatter";
import { getDefaultSettings } from "@/model";

import type PrettierPlugin from "@/main";
import type { Settings } from "@/model";
import type { App, Editor, EditorPosition } from "obsidian";

const resolve = (...paths: string[]) => path.resolve(import.meta.dirname, ...paths);

const insertCursorAtPosition = (code: string, cursor: EditorPosition) => {
    const { line, ch } = cursor;

    const lines = code.split("\n");
    const text = lines.at(line)!;
    lines[line] = text.slice(0, ch) + "│" + text.slice(ch);

    return lines.join("\n");
};

const frontmatters = [
    { name: "enabled-by-frontmatter", value: { prettier: true } },
    { name: "disabled-by-frontmatter", value: { prettier: false } },
    { name: "default", value: undefined },
];

const files = fs
    .readdirSync(resolve("inputs"))
    .map(filename => ({
        filename,
        extension: path.extname(filename),
        content: fs.readFileSync(resolve(`inputs/${filename}`), "utf-8"),
    }))
    .map(({ filename, extension, content }) =>
        frontmatters.map(({ name, value }) => ({
            name: filename,
            path: `${name}${extension}`,
            extension,
            content,
            frontmatter: value,
        })),
    )
    .flat();

const getAppByFile = (file: (typeof files)[number]) => {
    return {
        workspace: {
            getActiveFile: () => file,
        },
        metadataCache: {
            getCache: () => file,
        },
    } as unknown as App;
};

const MockPrettierPlugin = vi.fn(
    ({ settings, app }: Partial<{ settings: DeepPartial<Settings>; app: App }>) =>
        ({
            app,
            settings: { ...getDefaultSettings(), ...settings },
        }) as unknown as PrettierPlugin,
);

const MockEditor = vi.fn(
    ({
        value,
        setValue,
        cursor,
        setCursor,
        selection,
        replaceSelection,
    }: Partial<{
        value: string;
        setValue: typeof vi.fn;
        cursor: EditorPosition;
        setCursor: typeof vi.fn;
        selection: string;
        replaceSelection: typeof vi.fn;
    }>) =>
        ({
            getValue: () => value,
            getCursor: () => cursor,
            getSelection: () => selection,

            setValue,
            setCursor,
            replaceSelection,

            getScrollInfo: () => ({}),
            scrollTo: vi.fn(),
        }) as unknown as Editor,
);

describe("Check if should format", () => {
    it("Should format with {}", () => {
        const formatter = new Formatter(
            new MockPrettierPlugin({
                app: getAppByFile(files.find(file => file.frontmatter?.prettier === undefined)!),
            }),
        );

        expect(formatter.shouldFormat()).toBe(true);
    });

    it("Should format with { prettier: true }", () => {
        const formatter = new Formatter(
            new MockPrettierPlugin({
                app: getAppByFile(files.find(file => file.frontmatter?.prettier === true)!),
            }),
        );

        expect(formatter.shouldFormat()).toBe(true);
    });

    it("Should not format with { prettier: false }", () => {
        const formatter = new Formatter(
            new MockPrettierPlugin({
                app: getAppByFile(files.find(file => file.frontmatter?.prettier === false)!),
            }),
        );

        expect(formatter.shouldFormat()).toBe(false);
    });
});

describe("Format on save", () => {
    it("Should format on save", () => {
        const formatter = new Formatter(
            new MockPrettierPlugin({
                settings: { formatOnSave: true },
            }),
        );
        formatter.formatContent = vi.fn();
        formatter.formatOnSave(new MockEditor({}));
        expect(formatter.formatContent).toBeCalledTimes(1);
    });

    it("Should not format on save", () => {
        const formatter = new Formatter(
            new MockPrettierPlugin({
                settings: { formatOnSave: false },
            }),
        );
        formatter.formatContent = vi.fn();
        formatter.formatOnSave(new MockEditor({}));
        expect(formatter.formatContent).not.toBeCalled();
    });
});

describe("Get parser name from extension", () => {
    it("Should get parser name for .md", () => {
        const formatter = new Formatter(
            new MockPrettierPlugin({
                app: getAppByFile(files.find(file => file.extension === ".md")!),
            }),
        );

        expect(formatter.getParserName()).toBe("markdown");
    });

    it("Should get parser name for .mdx", () => {
        const formatter = new Formatter(
            new MockPrettierPlugin({
                app: getAppByFile(files.find(vFile => vFile.extension === ".mdx")!),
            }),
        );

        expect(formatter.getParserName()).toBe("mdx");
    });
});

describe("Get prettier options", () => {
    it("Should get prettier options with { formatCodeBlock: true }", () => {
        const formatter = new Formatter(
            new MockPrettierPlugin({
                settings: { formatOptions: { semi: true }, formatCodeBlock: true },
            }),
        );
        formatter.getParserName = vi.fn(() => "markdown");

        expect(formatter.getPrettierOptions()).toMatchObject({
            semi: true,
            embeddedLanguageFormatting: "auto",
        });
    });

    it("Should get prettier options with { formatCodeBlock: false }", () => {
        const formatter = new Formatter(
            new MockPrettierPlugin({
                settings: { formatOptions: { singleQuote: false }, formatCodeBlock: false },
            }),
        );
        formatter.getParserName = vi.fn(() => "markdown");

        expect(formatter.getPrettierOptions()).toMatchObject({
            singleQuote: false,
            embeddedLanguageFormatting: "off",
        });
    });
});

describe("Remove extra spaces", () => {
    it("Should remove extra spaces", () => {
        const formatter = new Formatter(new MockPrettierPlugin({}));

        for (const file of files) {
            expect(formatter.removeExtraSpaces(file.content)[0]).toMatchFileSnapshot(
                resolve(`outputs/remove-extra-spaces/${file.name}`),
            );
        }
    });

    it("Should remove extra spaces with cursorOffset", () => {
        const formatter = new Formatter(new MockPrettierPlugin({}));

        for (const file of files) {
            expect(formatter.removeExtraSpaces(file.content, 146)[1]).toEqual(146);
            expect(formatter.removeExtraSpaces(file.content, 147)[1]).toEqual(147);
            expect(formatter.removeExtraSpaces(file.content, 148)[1]).toEqual(147);
            expect(formatter.removeExtraSpaces(file.content, 149)[1]).toEqual(148);

            expect(formatter.removeExtraSpaces(file.content, 161)[1]).toEqual(160);
            expect(formatter.removeExtraSpaces(file.content, 162)[1]).toEqual(161);
            expect(formatter.removeExtraSpaces(file.content, 163)[1]).toEqual(161);
            expect(formatter.removeExtraSpaces(file.content, 164)[1]).toEqual(162);
        }
    });
});

describe("Add trailing spaces", () => {
    it("Should add trailing spaces", () => {
        const formatter = new Formatter(new MockPrettierPlugin({}));

        for (const file of files) {
            expect(formatter.addTrailingSpaces(file.content)[0]).toMatchFileSnapshot(
                resolve(`outputs/add-trailing-spaces/${file.name}`),
            );
        }
    });

    it("Should add trailing spaces with cursorOffset", () => {
        const formatter = new Formatter(new MockPrettierPlugin({}));

        for (const file of files) {
            expect(formatter.addTrailingSpaces(file.content, 276)[1]).toEqual(276);
            expect(formatter.addTrailingSpaces(file.content, 277)[1]).toEqual(278);

            expect(formatter.addTrailingSpaces(file.content, 278)[1]).toEqual(279);
            expect(formatter.addTrailingSpaces(file.content, 279)[1]).toEqual(280);
            expect(formatter.addTrailingSpaces(file.content, 280)[1]).toEqual(281);
        }
    });
});

describe("Format selection", () => {
    const endBeforeLineBreak = 115;
    const endAfterTrailingLineBreak = 116;
    const endAfterSingleLineBreak = 117;
    const endAfterMultipleLineBreak = 118;

    it("Should format selection with no line break", async () => {
        for (const file of files) {
            const selection = file.content.slice(0, endBeforeLineBreak);
            const replaceSelection = vi.fn();

            const editor = new MockEditor({ selection, replaceSelection });
            const formatter = new Formatter(new MockPrettierPlugin({ app: getAppByFile(file) }));

            await formatter.formatSelection(editor);

            const formatted = replaceSelection.mock.calls[0]?.[0] || selection;
            expect(formatted + file.content.slice(endBeforeLineBreak)).toMatchFileSnapshot(
                resolve(`outputs/format-selection/no-line-break/${file.path}`),
            );
        }
    });

    it("Should format selection with trailing line break", async () => {
        for (const file of files) {
            const selection = file.content.slice(0, endAfterTrailingLineBreak);
            const replaceSelection = vi.fn();

            const editor = new MockEditor({ selection, replaceSelection });
            const formatter = new Formatter(new MockPrettierPlugin({ app: getAppByFile(file) }));

            await formatter.formatSelection(editor);

            const formatted = replaceSelection.mock.calls[0]?.[0] || selection;
            expect(formatted + file.content.slice(endAfterTrailingLineBreak)).toMatchFileSnapshot(
                resolve(`outputs/format-selection/trailing-line-break/${file.path}`),
            );
        }
    });

    it("Should format selection with single line break", async () => {
        for (const file of files) {
            const selection = file.content.slice(0, endAfterSingleLineBreak);
            const replaceSelection = vi.fn();

            const editor = new MockEditor({ selection, replaceSelection });
            const formatter = new Formatter(new MockPrettierPlugin({ app: getAppByFile(file) }));

            await formatter.formatSelection(editor);

            const formatted = replaceSelection.mock.calls[0]?.[0] || selection;
            expect(formatted + file.content.slice(endAfterSingleLineBreak)).toMatchFileSnapshot(
                resolve(`outputs/format-selection/single-line-break/${file.path}`),
            );
        }
    });

    it("Should format selection with multiple line break", async () => {
        for (const file of files) {
            const selection = file.content.slice(0, endAfterMultipleLineBreak);
            const replaceSelection = vi.fn();

            const editor = new MockEditor({ selection, replaceSelection });
            const formatter = new Formatter(new MockPrettierPlugin({ app: getAppByFile(file) }));

            await formatter.formatSelection(editor);

            const formatted = replaceSelection.mock.calls[0]?.[0] || selection;
            expect(formatted + file.content.slice(endAfterMultipleLineBreak)).toMatchFileSnapshot(
                resolve(`outputs/format-selection/multiple-line-break/${file.path}`),
            );
        }
    });

    it("Should format selection with { tabWidth: 4 }", async () => {
        for (const file of files) {
            const selection = file.content.slice(0, endBeforeLineBreak);
            const replaceSelection = vi.fn();

            const editor = new MockEditor({ selection, replaceSelection });
            const formatter = new Formatter(
                new MockPrettierPlugin({
                    settings: { formatOptions: { tabWidth: 4 } },
                    app: getAppByFile(file),
                }),
            );

            await formatter.formatSelection(editor);

            const formatted = replaceSelection.mock.calls[0]?.[0] || selection;
            expect(formatted + file.content.slice(endBeforeLineBreak)).toMatchFileSnapshot(
                resolve(`outputs/format-selection/with-tab-width/${file.path}`),
            );
        }
    });

    it("Should format selection with modify spaces", async () => {
        for (const file of files) {
            const selection = file.content.slice(0, endBeforeLineBreak);
            const replaceSelection = vi.fn();

            const editor = new MockEditor({ selection, replaceSelection });
            const formatter = new Formatter(
                new MockPrettierPlugin({
                    settings: {
                        formatOptions: { tabWidth: 4 },
                        removeExtraSpaces: true,
                        addTrailingSpaces: true,
                    },
                    app: getAppByFile(file),
                }),
            );

            await formatter.formatSelection(editor);

            const formatted = replaceSelection.mock.calls[0]?.[0] || selection;
            expect(formatted + file.content.slice(endBeforeLineBreak)).toMatchFileSnapshot(
                resolve(`outputs/format-selection/with-modify-spaces/${file.path}`),
            );
        }
    });
});

describe("Format content", () => {
    const cursorBeforeModified: EditorPosition = { line: 0, ch: 20 };
    const cursorAfterModified: EditorPosition = { line: 12, ch: 10 };

    it("Should format content with cursor before modified", async () => {
        for (const file of files) {
            const setValue = vi.fn();
            const setCursor = vi.fn();

            const editor = new MockEditor({
                value: file.content,
                cursor: cursorBeforeModified,
                setValue,
                setCursor,
            });
            const formatter = new Formatter(new MockPrettierPlugin({ app: getAppByFile(file) }));

            await formatter.formatContent(editor);

            const formatted = setValue.mock.calls[0]?.[0] || file.content;
            const position = setCursor.mock.calls[0]?.[0] || cursorBeforeModified;
            expect(insertCursorAtPosition(formatted, position)).toMatchFileSnapshot(
                resolve(`outputs/format-content/cursor-before-modified/${file.path}`),
            );
        }
    });

    it("Should format content with cursor after modified", async () => {
        for (const file of files) {
            const setValue = vi.fn();
            const setCursor = vi.fn();

            const editor = new MockEditor({
                value: file.content,
                cursor: cursorAfterModified,
                setValue,
                setCursor,
            });
            const formatter = new Formatter(new MockPrettierPlugin({ app: getAppByFile(file) }));

            await formatter.formatContent(editor);

            const formatted = setValue.mock.calls[0]?.[0] || file.content;
            const position = setCursor.mock.calls[0]?.[0] || cursorAfterModified;
            expect(insertCursorAtPosition(formatted, position)).toMatchFileSnapshot(
                resolve(`outputs/format-content/cursor-after-modified/${file.path}`),
            );
        }
    });

    it("Should format content with { tabWidth: 4 }", async () => {
        for (const file of files) {
            const setValue = vi.fn();
            const setCursor = vi.fn();

            const editor = new MockEditor({
                value: file.content,
                cursor: cursorAfterModified,
                setValue,
                setCursor,
            });
            const formatter = new Formatter(
                new MockPrettierPlugin({
                    settings: { formatOptions: { tabWidth: 4 } },
                    app: getAppByFile(file),
                }),
            );

            await formatter.formatContent(editor);

            const formatted = setValue.mock.calls[0]?.[0] || file.content;
            const position = setCursor.mock.calls[0]?.[0] || cursorAfterModified;
            expect(insertCursorAtPosition(formatted, position)).toMatchFileSnapshot(
                resolve(`outputs/format-content/with-tab-width/${file.path}`),
            );
        }
    });

    it("Should format content with  modify spaces", async () => {
        for (const file of files) {
            const setValue = vi.fn();
            const setCursor = vi.fn();

            const editor = new MockEditor({
                value: file.content,
                cursor: cursorAfterModified,
                setValue,
                setCursor,
            });
            const formatter = new Formatter(
                new MockPrettierPlugin({
                    settings: {
                        formatOptions: { tabWidth: 4 },
                        removeExtraSpaces: true,
                        addTrailingSpaces: true,
                    },
                    app: getAppByFile(file),
                }),
            );

            await formatter.formatContent(editor);

            const formatted = setValue.mock.calls[0]?.[0] || file.content;
            const position = setCursor.mock.calls[0]?.[0] || cursorAfterModified;
            expect(insertCursorAtPosition(formatted, position)).toMatchFileSnapshot(
                resolve(`outputs/format-content/with-modify-spaces/${file.path}`),
            );
        }
    });
});
