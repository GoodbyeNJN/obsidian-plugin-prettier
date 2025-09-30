import path from "node:path";

import { readJson } from "@goodbyenjn/utils/fs";
import MagicStringStack from "magic-string-stack";
import { defineConfig } from "rolldown";

import packageJson from "./package.json";

import type PackageJson from "./package.json";

// eslint-disable-next-line import/order
import "dotenv/config";

const isWatchMode = process.env["ROLLDOWN_WATCH"] === "true";
const isHotreloadEnabled = isWatchMode && Boolean(process.env.OBSIDIAN_PLUGINS_DIR);

const output = isHotreloadEnabled
    ? path.resolve(process.env.OBSIDIAN_PLUGINS_DIR!, `${packageJson.obsidian.id}-dev`)
    : "dist";

const genManifest = async () => {
    const packageJson = await readJson<typeof PackageJson>("package.json");
    if (!packageJson) {
        throw new Error(`Failed to read package.json`);
    }

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

    return JSON.stringify(manifest, null, 4);
};

export default defineConfig([
    {
        input: ["src/main.ts", "src/styles.css", "package.json"],

        output: {
            dir: output,
            format: "cjs",
        },

        external: ["obsidian", "electron"],
        platform: "neutral",
        tsconfig: "tsconfig.json",

        plugins: [
            {
                name: "plugin:assets",
                load: {
                    filter: {
                        id: /package\.json$/,
                    },
                    handler() {
                        return "null";
                    },
                },
                transform: {
                    filter: {
                        code: "process.env.MANIFEST",
                    },
                    async handler(code) {
                        const s = new MagicStringStack(code);
                        s.replaceAll("process.env.MANIFEST", await genManifest());

                        return {
                            code: s.toString(),
                            map: s.generateMap(),
                        };
                    },
                },
                async generateBundle(_, bundle) {
                    for (const [k, v] of Object.entries(bundle)) {
                        if (v.type === "asset" || v.name === "main") continue;
                        delete bundle[k];
                    }

                    this.emitFile({
                        type: "asset",
                        fileName: "manifest.json",
                        source: await genManifest(),
                    });
                },
            },
        ],
    },
]);
