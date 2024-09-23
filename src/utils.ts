import type { EditorPosition } from "obsidian";

export const KEY = "plugin-prettier";

export const logger = (...params: Parameters<typeof console.log>) =>
    console.log(`[${KEY}]`, ...params);

export const timer = () => {
    const start = performance.now();

    return () => performance.now() - start;
};

export const createFragment = (...nodes: (Node | string)[]) => {
    const fragment = document.createDocumentFragment();
    nodes && fragment.append(...nodes);

    return fragment;
};

export const createElement = <K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    properties?: DeepPartial<HTMLElementTagNameMap[K]>,
    nodes?: (Node | string)[],
) => {
    const element = document.createElement(tagName);
    nodes && element.append(...nodes);

    for (const [k, v] of Object.entries(properties)) {
        if (k === "style") {
            for (const [key, value] of Object.entries(v)) {
                element[k][key] = value;
            }
        } else {
            element[k] = v!;
        }
    }

    return element;
};

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
