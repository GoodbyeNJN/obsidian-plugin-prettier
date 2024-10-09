import { cursorOffsetToPosition, positionToCursorOffset } from "@/utils/cursor";

const a = `
123456789
123456789
123456789
123456789
123456789
123456789
123456789
123456789
123456789
123456789
`.trim();

const b = `
123456789 123456789
123456789 123456789
123456789 123456789
123456789 123456789
123456789 123456789
`.trim();

describe("Transform cursor offset to position", () => {
    it("Should transform 5 to 0:5 for a", () => {
        expect(cursorOffsetToPosition(a, 5)).toEqual({ line: 0, ch: 5 });
    });

    it("Should transform 10 to 1:0 for a", () => {
        expect(cursorOffsetToPosition(a, 10)).toEqual({ line: 1, ch: 0 });
    });

    it("Should transform 5 to 0:5 for b", () => {
        expect(cursorOffsetToPosition(b, 5)).toEqual({ line: 0, ch: 5 });
    });

    it("Should transform 10 to 0:10 for b", () => {
        expect(cursorOffsetToPosition(b, 10)).toEqual({ line: 0, ch: 10 });
    });
});

describe("Transform position to cursor offset", () => {
    it("Should transform 0:5 to 5 for a", () => {
        expect(positionToCursorOffset(a, { line: 0, ch: 5 })).toEqual(5);
    });

    it("Should transform 1:0 to 10 for a", () => {
        expect(positionToCursorOffset(a, { line: 1, ch: 0 })).toEqual(10);
    });

    it("Should transform 0:5 to 5 for b", () => {
        expect(positionToCursorOffset(b, { line: 0, ch: 5 })).toEqual(5);
    });

    it("Should transform 0:10 to 10 for b", () => {
        expect(positionToCursorOffset(b, { line: 0, ch: 10 })).toEqual(10);
    });
});
