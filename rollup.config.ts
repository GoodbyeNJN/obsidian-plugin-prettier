import fs from "node:fs";
import path from "node:path";

import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

import type { OutputOptions, Plugin, RollupOptions } from "rollup";

// eslint-disable-next-line import/order
import "dotenv/config";

interface Manifest {
    id: string;
    name: string;
    version: string;
    author: string;
    authorUrl: string;
    description: string;
    isDesktopOnly: boolean;
    minAppVersion: string;
}

const isHotreloadEnabled = Boolean(
    process.env.ROLLUP_WATCH === "true" && process.env.OBSIDIAN_VAULT_PATH,
);

const generateManifest = async (): Promise<Manifest> => {
    const packageJson = JSON.parse(await fs.promises.readFile("./package.json", "utf-8"));
    const { version, description, author, obsidian } = packageJson;
    const { id, name, isDesktopOnly, minAppVersion } = obsidian;

    return {
        id: isHotreloadEnabled ? `${id}-dev` : id,
        name: isHotreloadEnabled ? `${name} (Dev)` : name,
        version,
        author: author.name,
        authorUrl: author.url,
        description,
        isDesktopOnly,
        minAppVersion,
    };
};

const manifestPlugin = (): Plugin => {
    return {
        name: "plugin:manifest",
        buildStart() {
            this.addWatchFile("./package.json");
        },
        async generateBundle() {
            const manifest = await generateManifest();
            const source = JSON.stringify(manifest, null, 4);

            this.emitFile({
                type: "asset",
                fileName: "manifest.json",
                source,
            });
        },
    };
};

const hotreloadPlugin = (): Plugin | undefined => {
    if (!isHotreloadEnabled) return;

    return {
        name: "plugin:hotreload",
        async generateBundle(options) {
            const { dir } = options;
            if (!dir) return;

            const isExists = await fs.promises
                .access(path.resolve(dir, ".hotreload"))
                .then(() => true)
                .catch(() => false);
            if (isExists) return;

            this.emitFile({
                type: "asset",
                fileName: ".hotreload",
                source: "",
            });
        },
    };
};

const getOutputOptions = async (): Promise<OutputOptions[]> => {
    const dirs = ["dist"];
    if (isHotreloadEnabled) {
        const { id } = await generateManifest();
        const pluginDir = path.resolve(process.env.OBSIDIAN_VAULT_PATH!, ".obsidian/plugins", id);
        dirs.push(pluginDir);
    }

    return dirs.map(dir => ({
        dir,
        format: "cjs",
        generatedCode: "es2015",
    }));
};

const options: RollupOptions = {
    input: {
        main: "src/main.ts",
    },
    output: await getOutputOptions(),
    external: [
        "obsidian",
        "electron",
        "@codemirror/autocomplete",
        "@codemirror/collab",
        "@codemirror/commands",
        "@codemirror/language",
        "@codemirror/lint",
        "@codemirror/search",
        "@codemirror/state",
        "@codemirror/view",
        "@lezer/common",
        "@lezer/highlight",
        "@lezer/lr",
    ],
    plugins: [typescript(), nodeResolve(), manifestPlugin(), hotreloadPlugin()],
};

export default options;
