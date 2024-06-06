export const KEY = "plugin-prettier";

export const logger = (...params: Parameters<typeof console.log>) =>
    console.log(`[${KEY}]`, ...params);

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
