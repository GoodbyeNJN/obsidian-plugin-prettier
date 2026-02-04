import path from "node:path";

import { safeReadFile, safeWriteFile } from "@goodbyenjn/utils/fs";
import { err, ok, safeTry } from "@goodbyenjn/utils/result";

import { PRETTIER_DIR } from "./shared.ts";

const patches = [
    {
        filepath: "src/main/normalize-format-options.js",
        match: `
const formatOptionsHiddenDefaults = {
  astFormat: "estree",
  printer: {},
  originalText: undefined,
  locStart: null,
  locEnd: null,
  getVisitorKeys: null,
};
`.trim(),
        replace: `
const formatOptionsHiddenDefaults = {
  astFormat: "estree",
  printer: {},
  originalText: undefined,
  locStart: null,
  locEnd: null,
  getVisitorKeys: null,
  __languageMappings: new Map(),
};
`.trim(),
    },
    {
        filepath: "src/language-markdown/embed.js",
        match: `
      const { lang: language } = node;
      if (!language) {
        return;
      }
`.trim(),
        replace: `
      const { lang } = node;
      if (!lang) {
        return;
      }
      const language = options.__languageMappings?.get(lang) || lang;
`.trim(),
    },
];

export const patch = () =>
    safeTry(async function* () {
        console.log("Starting patch...");

        let hasError = false;
        for (const { filepath, match, replace } of patches) {
            process.stdout.write(`Patching file: "${filepath}" ... `);

            const file = path.join(PRETTIER_DIR, filepath);
            const content = yield* await safeReadFile(file);
            if (!content) {
                process.stdout.write("Error: Failed to read file content\n");
                hasError = true;
                break;
            }

            const patched = content.replace(match, replace);
            if (patched === content) {
                process.stdout.write("Error: No changes made to the file\n");
                hasError = true;
                break;
            }

            yield* await safeWriteFile(file, patched);

            process.stdout.write("Done\n");
        }
        if (hasError) {
            console.log("Patch failed.");
            return err();
        }

        console.log("Patch completed.");
        console.log("------------------------------");

        return ok();
    });
