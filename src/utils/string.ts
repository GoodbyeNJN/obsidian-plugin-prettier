import type { EditorPosition } from "obsidian";

interface Matched {
    text: string;
    start: number;
    end: number;
    length: number;
}

type Diff =
    | { action: "insert"; start: number; length: number }
    | { action: "delete"; start: number; end: number };

export class MagicString {
    original: string;
    current: string;

    constructor(value: string) {
        this.original = value;
        this.current = value;
    }

    get isModified() {
        return this.original !== this.current;
    }

    insert(index: number, text: string, offset = -1) {
        const from = this.normalizeIndex(index);

        this.current = this.current.slice(0, from) + text + this.current.slice(from);

        if (offset === -1) return offset;

        return this.calcOffset(offset, {
            action: "insert",
            start: from,
            length: text.length,
        });
    }

    delete(start: number, end = Infinity, offset = -1) {
        let from = this.normalizeIndex(start);
        let to = this.normalizeIndex(end);
        if (from > to) {
            [from, to] = [to, from];
        }

        this.current = this.current.slice(0, from) + this.current.slice(to);

        if (offset === -1) return offset;

        return this.calcOffset(offset, {
            action: "delete",
            start: from,
            end: to,
        });
    }

    // eslint-disable-next-line max-params
    update(start: number, end: number, text: string, offset = -1) {
        let from = this.normalizeIndex(start);
        let to = this.normalizeIndex(end);
        if (from > to) {
            [from, to] = [to, from];
        }

        this.current = this.current.slice(0, from) + text + this.current.slice(to);

        return this.calcOffset(
            this.calcOffset(offset, {
                action: "delete",
                start: from,
                end: to,
            }),
            {
                action: "insert",
                start: from,
                length: text.length,
            },
        );
    }

    append(text: string, offset = -1) {
        return this.insert(Infinity, text, offset);
    }

    prepend(text: string, offset = -1) {
        return this.insert(0, text, offset);
    }

    mutate(text: string, offset = -1) {
        return this.update(0, Infinity, text, offset);
    }

    match<Length extends number>(regexp: RegExp) {
        return [...this.current.matchAll(new RegExp(regexp, "dgm"))].map(
            match =>
                Array.from(match)
                    .map((text, index) => ({
                        text,
                        indices: match.indices![index]!,
                    }))
                    .slice(1)
                    .map<Matched>(({ text, indices }) => ({
                        text,
                        start: indices[0],
                        end: indices[1],
                        length: text.length,
                    })) as Tuple<Length, Matched>,
        );
    }

    positionToOffset(position: EditorPosition) {
        const { line, ch } = position;

        const lines = this.current.split("\n");
        const prevLines = lines.slice(0, line);
        const prevLinesText = prevLines.join("\n").concat("\n");
        const prevLinesCharCount = prevLines.length === 0 ? 0 : prevLinesText.length;

        const offset = prevLinesCharCount + ch;

        return offset;
    }

    offsetToPosition(offset: number) {
        const lines = this.current.slice(0, offset).split("\n");
        const prevLines = lines.slice(0, -1);
        const prevLinesText = prevLines.join("\n").concat("\n");
        const prevLinesCharCount = prevLines.length === 0 ? 0 : prevLinesText.length;

        const line = prevLines.length;
        const ch = offset - prevLinesCharCount;

        return { line, ch };
    }

    calcOffset(offset: number, diff: Diff) {
        let index = offset;

        if (diff.action === "insert") {
            const { start, length } = diff;
            if (index >= start) {
                index += length;
            }
        } else {
            const { start, end } = diff;
            if (index > start && index <= end) {
                index = start;
            } else if (index > end) {
                index -= end - start;
            }
        }

        return index;
    }

    normalizeIndex(index: number) {
        let i = index;

        if (index < 0) {
            i = this.current.length + i;

            if (i < 0) {
                i = 0;
            }
        } else if (index > this.current.length) {
            i = this.current.length;
        }

        return i;
    }
}
