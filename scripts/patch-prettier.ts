#!/usr/bin/env tsx

import path from "node:path";

import { $ } from "zx";

import { rm, safeReadFile, safeWriteFile } from "@/utils/fs";
import { MagicString } from "@/utils/string";

import type { Promisable } from "type-fest";

const withPatchEnv = async (pkg: string, fn: (dir: string) => Promisable<void>) => {
    const temp = path.resolve(__dirname, "../.temp", pkg);

    await rm(temp);
    await $`pnpm patch ${pkg} --edit-dir ${temp}`;

    try {
        await fn(temp);
    } catch (error) {
        console.log("❌ Failed to patch files");
        console.log(error);
        await rm(temp);

        process.exit(1);
    }

    await $`pnpm patch-commit --patches-dir ./scripts/patches ${temp}`;
    await rm(temp);

    console.log("✅ Patched files successfully");
    process.exit(0);
};

const patch = async (temp: string) => {
    const patches = [
        {
            filepaths: ["standalone.js", "standalone.mjs"],
            handler: (content: string) =>
                content.replace(
                    '{astFormat:"estree",',
                    '{__languageMappings:new Map(),astFormat:"estree",',
                ),
        },
        {
            filepaths: ["plugins/markdown.js", "plugins/markdown.mjs"],
            handler: (content: string) => {
                const string = new MagicString(content);

                const [optionsVarName, nodeVarName] = (() => {
                    const matches = string.match<2>(
                        /function \w+\(\w+,(\w+)\)\{let\{node:(\w+)\}=\w+;/,
                    );
                    if (matches.length !== 1) {
                        throw new Error(`Function not found: function XX(X1,X2){let{node:X}=X1;`);
                    }

                    const [optionsVar, nodeVar] = matches[0]!;
                    const optionsVarName = optionsVar.text;
                    const nodeVarName = nodeVar.text;

                    return [optionsVarName, nodeVarName];
                })();

                const [replaceStart, replaceEnd] = (() => {
                    const matches = string.match<2>(
                        /(if\(\w+\.type==="code"&&\w+\.lang!==null\)\{).*(return \w+\(\[\w+,\w+\.lang,\w+\.meta)/,
                    );
                    if (matches.length !== 1) {
                        throw new Error(
                            `Block not found: if(X.type==="code"&&X.lang!==null){ ... return XX([XXX,X.lang,X.meta`,
                        );
                    }

                    const [replaceStart, replaceEnd] = matches[0]!;

                    return [replaceStart.end, replaceEnd.start];
                })();

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

                return string.current;
            },
        },
    ];

    for (const patch of patches) {
        const filepaths = patch.filepaths.map(filepath => path.resolve(temp, filepath));

        for (const filepath of filepaths) {
            const content = await safeReadFile(filepath);

            if (!content) {
                throw new Error(`File not exits or empty: ${filepath}`);
            }

            const patched = patch.handler(content);
            await safeWriteFile(filepath, patched);
        }
    }
};

withPatchEnv("prettier", patch);
