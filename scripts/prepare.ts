#!/usr/bin/env -S node

import { err, ok, safeTry } from "@goodbyenjn/utils/result";

import { build } from "./build.ts";
import { patch } from "./patch.ts";
import { $ } from "./shared.ts";

const main = () =>
    safeTry(async function* () {
        yield* await patch();
        yield* await build();

        const { exitCode, stdout, stderr } = yield* await $`git reset --hard`;
        if (exitCode !== 0) {
            console.log("------------------------------");
            console.log(stdout);
            console.log(stderr);
            console.log("------------------------------");
            console.log("Failed to reset git repository.");
            return err();
        }

        return ok();
    });

(await main()).unwrap(null);
