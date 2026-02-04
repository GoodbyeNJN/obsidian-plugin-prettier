import path from "node:path";

import { exists, safeCp, safeMkdir, safeReadFile, safeRm } from "@goodbyenjn/utils/fs";
import { err, ok, safeTry } from "@goodbyenjn/utils/result";

import { $, PRETTIER_DIR, PROJECT_DIR } from "./shared.ts";

const getYarnCmd = () =>
    safeTry(async function* () {
        const config = yield* await safeReadFile(path.join(PRETTIER_DIR, ".yarnrc.yml"));

        const match = config.match(/^\s*yarnPath:\s*(.+)\s*$/m);
        if (!match || !match[1]) return err("Failed to find yarnPath in .yarnrc.yml");

        return ok(`node ${match[1]}`);
    });

export const build = () =>
    safeTry(async function* () {
        const yarn = yield* await getYarnCmd();

        if (!(await exists(path.join(PRETTIER_DIR, "node_modules")))) {
            console.log("Starting installation...");

            const { exitCode, stdout, stderr } = yield* await $`${yarn} install --immutable`;
            if (exitCode !== 0) {
                console.log("------------------------------");
                console.log(stdout);
                console.log(stderr);
                console.log("------------------------------");
                console.log("Installation failed.");
                return err();
            }

            console.log("Installation completed.");
            console.log("------------------------------");
        }

        console.log("Starting build...");

        const { exitCode, stdout, stderr } =
            yield* await $`${yarn} build --clean --no-minify --package prettier`;
        if (exitCode !== 0) {
            console.log("------------------------------");
            console.log(stdout);
            console.log(stderr);
            console.log("------------------------------");
            console.log("Build failed.");
            return err();
        }

        console.log("Build completed.");

        const temp = path.join(PROJECT_DIR, ".temp");
        yield* await safeMkdir(temp);

        const dest = path.join(temp, "prettier");
        yield* await safeRm(dest);
        yield* await safeCp(path.join(PRETTIER_DIR, "dist", "prettier"), dest);

        return ok();
    });
