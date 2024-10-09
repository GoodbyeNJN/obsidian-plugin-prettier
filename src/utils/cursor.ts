import type { EditorPosition } from "obsidian";

export const positionToCursorOffset = (text: string, position: EditorPosition) => {
    const { line, ch } = position;

    const lines = text.split("\n");
    const prevLines = lines.slice(0, line);
    const prevLinesText = prevLines.join("\n").concat("\n");
    const prevLinesCharCount = prevLines.length === 0 ? 0 : prevLinesText.length;

    const cursorOffset = prevLinesCharCount + ch;

    return cursorOffset;
};

export const cursorOffsetToPosition = (text: string, cursorOffset: number): EditorPosition => {
    const lines = text.slice(0, cursorOffset).split("\n");
    const prevLines = lines.slice(0, -1);
    const prevLinesText = prevLines.join("\n").concat("\n");
    const prevLinesCharCount = prevLines.length === 0 ? 0 : prevLinesText.length;

    const line = prevLines.length;
    const ch = cursorOffset - prevLinesCharCount;

    return { line, ch };
};
