type JsxNode = Element | string | number | boolean | null | undefined;

type JsxProps<K extends keyof HTMLElementTagNameMap, T> = Partial<
    Omit<HTMLElementTagNameMap[K], "children">
> & { children?: T };

export namespace JSX {
    type Element = HTMLElement | DocumentFragment;
    type Fragment = DocumentFragment;
    type IntrinsicElements = {
        [K in keyof HTMLElementTagNameMap]: JsxProps<K, JsxNode | JsxNode[]>;
    };
}

export function Fragment(props: { children?: JsxNode | JsxNode[] }): props.children;

export function jsx<K extends keyof HTMLElementTagNameMap>(
    type: K,
    props: JsxProps<K, JsxNode>,
    key?: string,
): HTMLElementTagNameMap[K];

export function jsxs(
    type: typeof Fragment,
    props: { children?: JsxNode | JsxNode[] },
    key?: string,
): DocumentFragment;

export function jsxDEV<K extends keyof HTMLElementTagNameMap>(
    type: K | typeof Fragment,
    props: JsxProps<K, JsxNode | JsxNode[]>,
    key?: string,
): HTMLElementTagNameMap[K] | DocumentFragment;
