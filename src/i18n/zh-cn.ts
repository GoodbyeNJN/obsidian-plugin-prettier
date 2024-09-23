import type { Lang } from "./types";

export const ZH_CN: Lang = {
    "notice:format-too-slow": ["格式化耗时 ", " 秒，请考虑使用快速模式或缩减文件内容。"],
    "command:format-content-name": "格式化全部内容",
    "command:format-selection-name": "格式化选定内容",
    "setting:format-on-save-name": "保存时格式化",
    "setting:format-on-save-description": "保存文件时是否格式化当前内容。",
    "setting:format-code-block-name": "格式化代码块",
    "setting:format-code-block-description":
        "格式化时是否包含代码块。目前支持 js(x), ts(x), css, scss, less, html, json 和 yaml。",
    "setting:remove-extra-spaces-name": "删除额外空格",
    "setting:remove-extra-spaces-description": [
        "是否删除无序列表中项目符号后的多余空格。详情请参考 ",
        "issues#4114",
        " 和 ",
        "issues#4281",
        "。",
    ],
    "setting:add-trailing-spaces-name": "添加尾部空格",
    "setting:add-trailing-spaces-description":
        "是否在空列表项的末尾添加空格，以确保在实时阅览模式下正确渲染。",
    "setting:format-options-name": "格式化选项",
    "setting:format-options-description": [
        "传递给 Prettier 的格式化选项（json 格式）。详情请参考 ",
        "Prettier 文档",
        "。",
    ],
    "setting:format-options-valid": "✔️ 有效",
    "setting:format-options-invalid": "❌ 无效",
    "setting:reset-options-name": "重置选项",
    "setting:reset-options-description": "重置为默认格式化选项。",
    "setting:reset-options-button": "重置",
};
