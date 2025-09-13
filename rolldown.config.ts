import path from "node:path";

import { readFile, readJsonSync, writeFile } from "@goodbyenjn/utils/fs";
import { defineConfig } from "rolldown";
import { replacePlugin } from "rolldown/experimental";

import packageJson from "./package.json";

import type PackageJson from "./package.json";

// eslint-disable-next-line import/order
import "dotenv/config";

const isWatchMode = process.env["ROLLDOWN_WATCH"] === "true";
const isHotreloadEnabled = isWatchMode && Boolean(process.env.OBSIDIAN_PLUGINS_DIR);

const output = isHotreloadEnabled
    ? path.resolve(process.env.OBSIDIAN_PLUGINS_DIR!, `${packageJson.obsidian.id}-dev`)
    : "dist";

const genManifest = () => {
    const packageJson = readJsonSync<typeof PackageJson>("package.json");
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

const writeStylesCss = async () => {
    const css = await readFile("src/styles.css");
    if (css === null) {
        throw new Error(`Failed to read styles.css`);
    }

    await writeFile(path.join(output, "styles.css"), css);
};

const writeManifestJson = async () => {
    const json = genManifest() + "\n";

    const outputs = [path.join(output, "manifest.json")];
    if (!isWatchMode) {
        outputs.push("manifest.json");
    }

    await Promise.all(outputs.map(output => writeFile(output, json)));
};

export default defineConfig([
    {
        input: "src/main.ts",

        output: {
            dir: output,
            format: "cjs",
        },

        external: ["obsidian", "electron"],
        platform: "neutral",
        tsconfig: "tsconfig.json",

        plugins: [
            replacePlugin(
                {
                    "process.env.MANIFEST": genManifest(),
                },
                { preventAssignment: true },
            ),

            {
                name: "plugin:assets",
                buildStart() {
                    this.addWatchFile("src/styles.css");
                    this.addWatchFile("package.json");
                },
                async watchChange(id) {
                    switch (path.basename(id)) {
                        case "styles.css": {
                            await writeStylesCss();
                            break;
                        }
                        case "package.json": {
                            await writeManifestJson();
                            break;
                        }
                    }
                },
                async writeBundle() {
                    const promises = [writeStylesCss(), writeManifestJson()];
                    if (isHotreloadEnabled) {
                        promises.push(writeFile(path.join(output, ".hotreload"), ""));
                    }

                    await Promise.all(promises);
                },
            },
        ],
    },
]);
