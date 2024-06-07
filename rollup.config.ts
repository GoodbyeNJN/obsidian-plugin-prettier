import fs from "node:fs";
import path from "node:path";

import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

import type { OutputBundle, OutputOptions, Plugin, RollupOptions } from "rollup";

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

interface OutputPluginApi {
    getAllBundles: () => OutputBundle;
}

const isHotreloadEnabled = Boolean(
    process.env.ROLLUP_WATCH === "true" && process.env.OBSIDIAN_VAULT_PATH,
);

const generateManifest = async (isDev?: boolean): Promise<Manifest> => {
    const packageJson = JSON.parse(await fs.promises.readFile("./package.json", "utf-8"));
    const { version, description, author, obsidian } = packageJson;
    const { id, name, isDesktopOnly, minAppVersion } = obsidian;

    return {
        id: isDev ? `${id}-dev` : id,
        name: isDev ? `${name} (Dev)` : name,
        version,
        author: author.name,
        authorUrl: author.url,
        description,
        isDesktopOnly,
        minAppVersion,
    };
};

const output = (): Plugin<OutputPluginApi> => {
    let bundles: OutputBundle = Object.create(null);

    return {
        name: "plugin:output",
        api: {
            getAllBundles() {
                return bundles;
            },
        },
        generateBundle(options, bundle) {
            bundles = { ...bundle };

            for (const [k] of Object.entries(bundle)) {
                delete bundle[k];
            }
        },
    };
};

const outputMain = (): Plugin => {
    let outputPluginApi: OutputPluginApi | undefined;

    return {
        name: "plugin:output:main",
        renderStart(outputOptions, inputOptions) {
            const outputPlugin = inputOptions.plugins.find(
                (plugin): plugin is Plugin<OutputPluginApi> => plugin.name === "plugin:output",
            );

            outputPluginApi = outputPlugin?.api;
        },
        generateBundle() {
            if (!outputPluginApi) return;

            const bundles = outputPluginApi.getAllBundles();
            for (const [k, v] of Object.entries(bundles)) {
                if (v.type !== "chunk" || k !== "main.js") continue;

                const { code, exports, fileName, map, sourcemapFileName } = v;
                this.emitFile({
                    code,
                    exports,
                    fileName,
                    map: map || undefined,
                    sourcemapFileName: sourcemapFileName || undefined,
                    type: "prebuilt-chunk",
                });
            }
        },
    };
};

const outputManifest = (isDev?: boolean): Plugin => {
    return {
        name: "plugin:output:manifest",
        renderStart() {
            this.addWatchFile("package.json");
        },
        async generateBundle() {
            const manifest = await generateManifest(isDev);
            const source = JSON.stringify(manifest, null, 4);

            this.emitFile({
                fileName: "manifest.json",
                source,
                type: "asset",
            });
        },
    };
};

const outputHotreload = (): Plugin => {
    return {
        name: "plugin:output:hotreload",
        async generateBundle(options) {
            const { dir } = options;
            if (!dir) return;

            const isExists = await fs.promises
                .access(path.resolve(dir, ".hotreload"))
                .then(() => true)
                .catch(() => false);
            if (isExists) return;

            this.emitFile({
                fileName: ".hotreload",
                source: "",
                type: "asset",
            });
        },
    };
};

const getOutputOptions = async () => {
    const outputs: OutputOptions[] = [
        {
            dir: ".",
            plugins: [outputManifest(false)],
        },
        {
            dir: "dist",
            plugins: [outputMain(), outputManifest(false)],
        },
    ];

    if (isHotreloadEnabled) {
        const { id } = await generateManifest(true);
        const dir = path.resolve(process.env.OBSIDIAN_VAULT_PATH!, ".obsidian/plugins", id);

        outputs.push({
            dir,
            plugins: [outputHotreload(), outputMain(), outputManifest(true)],
        });
    }

    return outputs.map<OutputOptions>(output => ({
        ...output,
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
    plugins: [typescript(), resolve(), output()],
};

export default options;
