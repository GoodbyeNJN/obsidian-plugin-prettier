import path from "node:path";

import { Result } from "@goodbyenjn/utils/result";
import { exec } from "@goodbyenjn/utils/shell";

export const PROJECT_DIR = path.resolve(import.meta.dirname, "..");

export const PRETTIER_DIR = path.join(PROJECT_DIR, "prettier");

export const $ = Result.toSafeCallable(
    exec({
        nodeOptions: { cwd: PRETTIER_DIR },
        // nodeOptions: { cwd: PRETTIER_DIR, stdio: "inherit" },
    }),
    Error,
);
