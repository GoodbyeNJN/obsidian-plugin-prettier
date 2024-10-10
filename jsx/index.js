const Fragment = Symbol.for("jsx.fragment");

const appendChildren = (element, children) => {
    if (typeof children === "boolean" || children === null || typeof children === "undefined") {
        return;
    }

    if (Array.isArray(children)) {
        for (const child of children) {
            appendChildren(element, child);
        }

        return;
    }

    if (children instanceof Element || typeof children === "string") {
        element.append(children);
    } else {
        element.append(children.toString());
    }
};

function jsxFactory(type, props) {
    const { children, ...rest } = props;

    if (type === Fragment) {
        const fragment = document.createDocumentFragment();
        appendChildren(fragment, children);

        return fragment;
    }

    const element = document.createElement(type);
    appendChildren(element, children);

    for (const [k, v] of Object.entries(rest)) {
        if (k === "style") {
            for (const [key, value] of Object.entries(v)) {
                element[k][key] = value;
            }
        } else {
            element[k] = v;
        }
    }

    return element;
}

exports.Fragment = Fragment;
exports.jsx = jsxFactory;
exports.jsxs = jsxFactory;
exports.jsxDEV = jsxFactory;
