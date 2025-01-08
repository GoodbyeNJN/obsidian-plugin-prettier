import { MagicString } from "@/utils/string";

const input = `
1234 6789
1234 6789
`.trim();

const single = "x";
const multiple = "xx";

describe("Normalize index", () => {
    test.concurrent.for([
        { index: 0, expected: 0 },

        { index: 4, expected: 4 },
        { index: 5, expected: 5 },
        { index: 9, expected: 9 },
        { index: 10, expected: 10 },
        { index: 14, expected: 14 },
        { index: 15, expected: 15 },

        { index: -4, expected: 15 },
        { index: -5, expected: 14 },
        { index: -9, expected: 10 },
        { index: -10, expected: 9 },
        { index: -14, expected: 5 },
        { index: -15, expected: 4 },

        { index: 19, expected: 19 },
        { index: 20, expected: 19 },
        { index: Infinity, expected: 19 },

        { index: -19, expected: 0 },
        { index: -20, expected: 0 },
        { index: -Infinity, expected: 0 },
    ])("Normalize index: $index", ({ index, expected }, { expect }) => {
        const text = new MagicString(input);

        expect(text.normalizeIndex(index)).toBe(expected);
    });
});

describe("Insert text", () => {
    test.concurrent.for([
        {
            index: 4,
            expected: `
1234x 6789
1234 6789
`,
        },
        {
            index: 5,
            expected: `
1234 x6789
1234 6789
`,
        },
        {
            index: 9,
            expected: `
1234 6789x
1234 6789
`,
        },
        {
            index: 10,
            expected: `
1234 6789
x1234 6789
`,
        },
        {
            index: -4,
            expected: `
1234 6789
1234 x6789
`,
        },
        {
            index: -5,
            expected: `
1234 6789
1234x 6789
`,
        },

        {
            index: -Infinity,
            expected: `
x1234 6789
1234 6789
`,
        },
        {
            index: Infinity,
            expected: `
1234 6789
1234 6789x
`,
        },
    ])("Insert at index: $index", ({ index, expected }, { expect }) => {
        const text = new MagicString(input);
        text.insert(index, single);

        expect(text.current).toBe(expected.trim());
    });

    test.concurrent.for([
        { index: 5, offset: 0, expected: 0 },
        { index: 5, offset: 19, expected: 20 },
        { index: -5, offset: 0, expected: 0 },
        { index: -5, offset: 19, expected: 20 },
    ])("Insert with offset: $offset", ({ index, offset, expected }, { expect }) => {
        const text = new MagicString(input);

        expect(text.insert(index, single, offset)).toBe(expected);
    });
});

describe("Delete text", () => {
    test.concurrent.for([
        {
            start: 4,
            end: 5,
            expected: `
12346789
1234 6789
`,
        },
        {
            start: 9,
            end: 10,
            expected: `
1234 67891234 6789
`,
        },
        {
            start: -4,
            end: -5,
            expected: `
1234 6789
12346789
`,
        },
        {
            start: -9,
            end: -10,
            expected: `
1234 67891234 6789
`,
        },
        {
            start: 4,
            end: undefined,
            expected: `
1234
`,
        },
        {
            start: -5,
            end: undefined,
            expected: `
1234 6789
1234
`,
        },
    ])("Delete range: ($start,$end)", ({ start, end, expected }, { expect }) => {
        const text = new MagicString(input);
        text.delete(start, end);

        expect(text.current).toBe(expected.trim());
    });

    test.concurrent.for([
        { start: 5, end: 6, offset: 0, expected: 0 },
        { start: 5, end: 6, offset: 19, expected: 18 },
        { start: -5, end: -6, offset: 0, expected: 0 },
        { start: -5, end: -6, offset: 19, expected: 18 },
    ])("Delete with offset: $offset", ({ start, end, offset, expected }, { expect }) => {
        const text = new MagicString(input);

        expect(text.delete(start, end, offset)).toBe(expected);
    });
});

describe("Update Text", () => {
    test.concurrent.for([
        {
            start: 4,
            end: 5,
            expected: `
1234x6789
1234 6789
`,
        },
        {
            start: 9,
            end: 10,
            expected: `
1234 6789x1234 6789
`,
        },
        {
            start: -4,
            end: -5,
            expected: `
1234 6789
1234x6789
`,
        },
        {
            start: -9,
            end: -10,
            expected: `
1234 6789x1234 6789
`,
        },
        {
            start: 4,
            end: Infinity,
            expected: `
1234x
`,
        },
        {
            start: -5,
            end: Infinity,
            expected: `
1234 6789
1234x
`,
        },
    ])("Update range: ($start,$end)", ({ start, end, expected }, { expect }) => {
        const text = new MagicString(input);
        text.update(start, end, single);

        expect(text.current).toBe(expected.trim());
    });

    test.concurrent.for([
        { start: 5, end: 6, offset: 0, expected: 0 },
        { start: 5, end: 6, offset: 19, expected: 20 },
        { start: -5, end: -6, offset: 0, expected: 0 },
        { start: -5, end: -6, offset: 19, expected: 20 },
    ])("Update with offset: $offset", ({ start, end, offset, expected }, { expect }) => {
        const text = new MagicString(input);

        expect(text.update(start, end, multiple, offset)).toBe(expected);
    });
});

describe("Slice Text", () => {
    test.concurrent.for([
        {
            start: 3,
            end: 6,
            expected: `
4 6
`,
        },
        {
            start: 8,
            end: 11,
            expected: `
9
1
`,
        },
        {
            start: -3,
            end: -6,
            expected: `
4 6
`,
        },
        {
            start: -8,
            end: -11,
            expected: `
9
1
`,
        },
        {
            start: 3,
            end: Infinity,
            expected: `
4 6789
1234 6789
`,
        },
        {
            start: -6,
            end: Infinity,
            expected: `
4 6789
`,
        },
    ])("Slice range: ($start,$end)", ({ start, end, expected }, { expect }) => {
        const text = new MagicString(input);
        text.slice(start, end);

        expect(text.current).toBe(expected.trim());
    });

    test.concurrent.for([
        { start: 3, end: 6, offset: 0, expected: 0 },
        { start: 3, end: 6, offset: 4, expected: 1 },
        { start: 3, end: 6, offset: 19, expected: 3 },
        { start: -3, end: -6, offset: 0, expected: 0 },
        { start: -3, end: -6, offset: 15, expected: 2 },
        { start: -3, end: -6, offset: 19, expected: 3 },
    ])("Slice with offset: $offset", ({ start, end, offset, expected }, { expect }) => {
        const text = new MagicString(input);

        expect(text.slice(start, end, offset)).toBe(expected);
    });
});

describe("Transform position to offset", () => {
    test.concurrent.for([
        { line: 0, ch: 4, expected: 4 },
        { line: 0, ch: 5, expected: 5 },
        { line: 0, ch: 9, expected: 9 },

        { line: 1, ch: 4, expected: 14 },
        { line: 1, ch: 5, expected: 15 },
        { line: 1, ch: 9, expected: 19 },

        { line: 0, ch: 10, expected: 10 },
        { line: 1, ch: 0, expected: 10 },
    ])("Transform position: $line:$ch", ({ line, ch, expected }, { expect }) => {
        const text = new MagicString(input);

        expect(text.positionToOffset({ line, ch })).toBe(expected);
    });
});

describe("Transform offset to position", () => {
    test.concurrent.for([
        { offset: 4, expected: { line: 0, ch: 4 } },
        { offset: 5, expected: { line: 0, ch: 5 } },
        { offset: 9, expected: { line: 0, ch: 9 } },

        { offset: 14, expected: { line: 1, ch: 4 } },
        { offset: 15, expected: { line: 1, ch: 5 } },
        { offset: 19, expected: { line: 1, ch: 9 } },

        { offset: 10, expected: { line: 1, ch: 0 } },
    ])("Transform offset: $offset", ({ offset, expected }, { expect }) => {
        const text = new MagicString(input);

        expect(text.offsetToPosition(offset)).toEqual(expected);
    });
});
