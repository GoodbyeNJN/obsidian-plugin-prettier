import path from "node:path";

import commonjs from "@rollup/plugin-commonjs";
import node from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import { isArray, isPlainObject } from "remeda";
import { defineConfig } from "rollup";
import esbuild from "rollup-plugin-esbuild";

import { readFile, readJsonSync } from "./src/utils/fs";

import type PackageJson from "./package.json";
import type { Plugin, RollupOptions } from "rollup";

// eslint-disable-next-line import/order
import "dotenv/config";

const isWatchMode = process.env.ROLLUP_WATCH === "true";
const isHotreloadEnabled = isWatchMode && Boolean(process.env.OBSIDIAN_PLUGINS_DIR);

const START_MARK = "/* start */`\n";
const END_MARK = "\n`/* end */";

const wrap = (code: string) => `export default ${START_MARK}${code}${END_MARK};`;

const strip = (code: string) => {
    const start = code.indexOf(START_MARK) + START_MARK.length;
    const end = code.indexOf(END_MARK);

    return code.slice(start, end);
};

const genManifest = () => {
    const packageJson = readJsonSync<typeof PackageJson>("./package.json");

    const { version, description, author, obsidian } = packageJson;
    const { id, name, isDesktopOnly, minAppVersion } = obsidian;
    const manifest: Manifest = {
        id: isHotreloadEnabled ? `${id}-dev` : id,
        name: isHotreloadEnabled ? `${name} (Dev)` : name,
        version,
        author: author.name,
        authorUrl: author.url,
        description,
        isDesktopOnly,
        minAppVersion,
    };

    return manifest;
};

const pluginHotreload = (file: string): Plugin => ({
    name: "plugin:hotreload",
    async options(options: RollupOptions) {
        if (!isHotreloadEnabled) return null;

        const { id } = genManifest();

        if (isPlainObject(options.output)) {
            options.output = [options.output];
        } else if (!isArray(options.output)) {
            options.output = [];
        }

        options.output.push({
            ...(options.output[0] || {}),
            file: path.resolve(process.env.OBSIDIAN_PLUGINS_DIR!, id, file),
        });

        return options;
    },
});

export default defineConfig([
    {
        input: "src/main.ts",

        output: [{ file: "dist/main.js", format: "cjs" }],

        external: ["obsidian", "electron"],

        plugins: [
            pluginHotreload("main.js"),
            replace({
                "process.env.MANIFEST": JSON.stringify(genManifest()),
                preventAssignment: true,
            }),
            esbuild(),
            node(),
            commonjs(),
        ],
    },

    {
        input: "src/styles.css",

        output: [{ file: "dist/styles.css" }],

        plugins: [
            pluginHotreload("styles.css"),
            {
                name: "plugin:styles",
                async load(id) {
                    const styles = await readFile(id);

                    return wrap(styles);
                },
                renderStart() {
                    this.addWatchFile("src/styles.css");
                },
                renderChunk(code) {
                    return strip(code);
                },
            },
        ],
    },

    {
        input: "package.json",

        output: [{ file: "dist/manifest.json" }].concat(
            isWatchMode ? [] : { file: "manifest.json" },
        ),

        plugins: [
            pluginHotreload("manifest.json"),
            {
                name: "plugin:manifest",
                load() {
                    const manifest = genManifest();

                    return wrap(JSON.stringify(manifest, null, 4));
                },
                renderStart() {
                    this.addWatchFile("package.json");
                },
                renderChunk(code) {
                    return strip(code);
                },
            },
        ],
    },

    {
        input: ".hotreload",

        output: [{ file: "/dev/null" }],

        plugins: [
            pluginHotreload(".hotreload"),
            {
                name: "plugin:dot-hotreload",
                resolveId(id) {
                    return id;
                },
                load() {
                    return wrap("");
                },
                async renderChunk() {
                    return "";
                },
            },
        ],
    },
]);
