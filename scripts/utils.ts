import path from "node:path";

import { $ } from "@goodbyenjn/utils";
import { safeReadFile, safeWriteFile } from "@goodbyenjn/utils/fs";
import * as R from "@goodbyenjn/utils/remeda";
import { err, ok, safeTry } from "@goodbyenjn/utils/result";
import { glob } from "tinyglobby";

import type { Result } from "@goodbyenjn/utils/result";

export type PatchHandler = (filepath: string, content: string) => Promisable<Result<string>>;

export type Pattern = string | string[];

export interface Patch {
    pattern: Pattern;
    handler: PatchHandler;
}

const NODE_MODULES_DIR = path.relative(
    process.cwd(),
    path.resolve(import.meta.dirname, "../node_modules"),
);
const PATCH_TEMP_DIR = path.join(NODE_MODULES_DIR, ".patch-temp");
const DIFF_FILES_DIR = path.relative(process.cwd(), path.resolve(import.meta.dirname, "patches"));

const isDryRun = process.argv.includes("--dry-run");

const applyPatch = async (filepath: string, handler: PatchHandler) =>
    safeTry(async function* () {
        const content = yield* await safeReadFile(filepath);
        if (content.length === 0) return err(`File is empty: ${filepath}`);

        const patched = yield* (await handler(filepath, content)).context(
            `Failed to apply patch to file: ${filepath}`,
        );
        if (patched === content) return err(`File is not changed: ${filepath}`);

        return await safeWriteFile(filepath, patched);
    });

const collectFiles = (patches: Patch[], cwd: string) =>
    R.pipe(
        patches,
        R.map(async ({ pattern, handler }) => ({
            filepaths: await glob(pattern, {
                cwd,
                expandDirectories: false,
            }),
            handler,
        })),
        R.flatMapP(({ filepaths, handler }) => filepaths.map(filepath => ({ filepath, handler }))),
        R.awaitAll,
    );

const init = async (pkg: string, temp: string) => {
    const commit = async () => {
        if (isDryRun) {
            const origin = path.join(NODE_MODULES_DIR, pkg);
            // const origin = await fsp.realpath(path.join(NODE_MODULES_DIR, pkg));
            const diffFile = path.join(PATCH_TEMP_DIR, `${pkg}.patch`);
            const result = await $`diff -ruN -x '.bin' ${origin} ${temp} > ${diffFile} || true`;
            result.context(`Failed to create diff file for package: ${pkg}`);

            return result;
        }

        const result =
            await $`pnpm patch-commit --patches-dir ${path.relative(process.cwd(), DIFF_FILES_DIR)} ${temp}`;
        result.context(`Failed to commit patches for package: ${pkg}`);

        return result;
    };

    const cleanup = async () => {
        if (isDryRun) return ok();

        const result = await $`rm -rf ${temp}`;
        result.context(`Failed to cleanup patch environment for package: ${pkg}`);

        return result;
    };

    const prepare = async () => {
        const result = await safeTry(async function* () {
            yield* await $`rm -rf ${temp}`;
            return await $`pnpm patch ${pkg} --edit-dir ${temp}`;
        });
        result.context(`Failed to prepare patch environment for package: ${pkg}`);

        return result;
    };

    return { commit, cleanup, prepare };
};

export const patch = async (pkg: string, patches: Patch[]) => {
    const temp = path.join(PATCH_TEMP_DIR, pkg);
    const { commit, cleanup, prepare } = await init(pkg, temp);

    const result = await safeTry(async function* () {
        yield* await prepare();

        const files = await collectFiles(patches, temp);
        console.log(`Collected files for patching:`);
        console.log(files.map(({ filepath }) => `    ${filepath}`).join("\n"));
        console.log();

        for (const { filepath, handler } of files) {
            process.stdout.write(`Applying patch to file: ${filepath} ...`);
            const result = await applyPatch(path.join(temp, filepath), handler);
            process.stdout.write(` ${result.isOk() ? "✅" : "❌"}\n`);
            yield* result;
        }

        yield* await commit();
        if (isDryRun) {
            console.log();
            console.log(
                `[dry-run] Patch file created at: ${path.join(PATCH_TEMP_DIR, `${pkg}.patch`)}`,
            );
        }

        yield* await cleanup();

        return ok();
    });

    console.log();
    if (result.isErr()) {
        result.print("minimal");
        if (!isDryRun) {
            await $`rm -rf ${PATCH_TEMP_DIR}`;
        }

        process.exit(1);
    }

    console.log("✅ All patches applied successfully.");
    if (!isDryRun) {
        await $`rm -rf ${PATCH_TEMP_DIR}`;
    }

    process.exit(0);
};
