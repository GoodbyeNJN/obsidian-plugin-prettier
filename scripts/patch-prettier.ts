#!/usr/bin/env -S node --disable-warning=ExperimentalWarning

import path from "node:path";

import { $ } from "@goodbyenjn/utils";
import { rm, safeReadFile, safeWriteFile } from "@goodbyenjn/utils/fs";
import { err, ok } from "@goodbyenjn/utils/result";

import { MagicString } from "@/utils/string";

import type { Result } from "@goodbyenjn/utils/result";

const patch = async (temp: string) => {
    const patches = [
        {
            filepaths: ["standalone.js", "standalone.mjs"],
            handler: (content: string) =>
                ok(
                    content.replace(
                        '{astFormat:"estree",',
                        '{__languageMappings:new Map(),astFormat:"estree",',
                    ),
                ),
        },
        {
            filepaths: ["plugins/markdown.js", "plugins/markdown.mjs"],
            handler: (content: string) => {
                const string = new MagicString(content);

                let optionsVarName: string;
                let nodeVarName: string;
                {
                    const matches = string.match<2>(
                        /function \w+\(\w+,(\w+)\)\{let\{node:(\w+)\}=\w+;/,
                    );
                    if (matches.length !== 1) {
                        return err(`Function not found: function XX(X1,X2){let{node:X}=X1;`);
                    }

                    const [optionsVar, nodeVar] = matches[0]!;
                    optionsVarName = optionsVar.text;
                    nodeVarName = nodeVar.text;
                }

                let replaceStart: number;
                let replaceEnd: number;
                {
                    const matches = string.match<2>(
                        /(if\(\w+\.type==="code"&&\w+\.lang!==null\)\{).*(return \w+\(\[\w+,\w+\.lang,\w+\.meta)/,
                    );
                    if (matches.length !== 1) {
                        return err(
                            `Block not found: if(X.type==="code"&&X.lang!==null){ ... return XX([XXX,X.lang,X.meta`,
                        );
                    }

                    const [start, end] = matches[0]!;
                    replaceStart = start.end;
                    replaceEnd = end.start;
                }

                let offset = replaceEnd;
                while (true) {
                    const [start, end] = string.find(`${nodeVarName}.lang`, replaceStart);
                    if (start === -1 || start >= offset) break;

                    offset = string.update(start, end, "language", offset);
                }

                string.insert(
                    replaceStart,
                    `const language = ${optionsVarName}.__languageMappings?.get(${nodeVarName}.lang) || ${nodeVarName}.lang;`,
                );

                return ok(string.current);
            },
        },
    ];

    for (const patch of patches) {
        const filepaths = patch.filepaths.map(filepath => path.resolve(temp, filepath));

        for (const filepath of filepaths) {
            const readResult = await safeReadFile(filepath);
            if (!readResult.isOk()) {
                return err(`Failed to read ${filepath}: ${readResult.error}`);
            }

            const patchResult = patch.handler(readResult.value);
            if (!patchResult.isOk()) {
                return err(`Failed to patch ${filepath}: ${patchResult.error}`);
            }

            const writeResult = await safeWriteFile(filepath, patchResult.value);
            if (!writeResult.isOk()) {
                return err(`Failed to write ${filepath}: ${writeResult.error}`);
            }
        }
    }

    return ok();
};

const withPatchEnv = async (pkg: string, fn: (dir: string) => Promisable<Result<void, string>>) => {
    const temp = path.resolve(__dirname, "../.temp", pkg);

    await rm(temp);
    await $`pnpm patch ${pkg} --edit-dir ${temp}`;

    const result = await fn(temp);
    if (!result.isOk()) {
        console.log("× Failed to patch files");
        console.log(result.error);
        await rm(temp);

        process.exit(1);
    }

    await $`pnpm patch-commit --patches-dir ./scripts/patches ${temp}`;
    await rm(temp);

    console.log("✓ Patched files successfully");
    process.exit(0);
};

withPatchEnv("prettier", patch);
