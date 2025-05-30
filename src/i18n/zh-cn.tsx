/* eslint-disable no-template-curly-in-string */

import type { Lang } from "./types";

export const ZH_CN = {
    "notice:format-too-slow": {
        template: "格式化耗时 ${time} 秒，请考虑使用快速模式或缩减文件内容。",
        placeholder: {
            time: "",
        },
    },
    "command:format-content-name": "格式化全部内容",
    "command:format-selection-name": "格式化选定内容",
    "setting:format-on-save-name": "保存时格式化",
    "setting:format-on-save-description": "保存文件时是否格式化当前内容。",
    "setting:format-on-file-change-name": "文件更改时格式化",
    "setting:format-on-file-change-description":
        "当文件关闭或切换到其他文件时格式化最后打开的文件。",
    "setting:format-code-block-name": "格式化代码块",
    "setting:format-code-block-description":
        "格式化时是否包含代码块。目前支持 js(x), ts(x), css, scss, less, html, json 和 yaml。",
    "setting:remove-extra-spaces-name": "删除额外空格",
    "setting:remove-extra-spaces-description": (
        <>
            是否删除无序列表中项目符号后的多余空格。详情请参考{" "}
            <a href="https://github.com/prettier/prettier/issues/4114">issues#4114</a> 和{" "}
            <a href="https://github.com/prettier/prettier/issues/4281">issues#4281</a>。
        </>
    ),
    "setting:add-trailing-spaces-name": "添加尾部空格",
    "setting:add-trailing-spaces-description":
        "是否在空列表项的末尾添加空格，以确保在实时阅览模式下正确渲染。",
    "setting:format-options-name": "格式化选项",
    "setting:format-options-description": (
        <>
            传递给 Prettier 的格式化选项（json 格式）。详情请参考{" "}
            <a href="https://prettier.io/docs/en/configuration">Prettier 文档</a>。
        </>
    ),
    "setting:ignore-patterns-name": "忽略模式",
    "setting:ignore-patterns-description": (
        <>
            格式化时要忽略的模式列表。如果当前文件通过 frontmatter
            单独启用或禁用格式化，此设置将被忽略。详情请参考{" "}
            <a href="https://prettier.io/docs/en/ignore#ignoring-files-prettierignore">
                Prettier 文档
            </a>
            。
        </>
    ),
    "setting:language-mappings-name": "代码块语言映射",
    "setting:language-mappings-description":
        "将代码块语言从一种映射到另一种。例如，设置 `dataviewjs → js` 的映射后，Prettier 将对所有 `dataviewjs` 代码块使用 `js` 语言格式化。",
    "setting:reset-button-name": "重置",
    "setting:add-button-name": "添加",
    "setting:delete-button-name": "删除",
} satisfies Lang;
