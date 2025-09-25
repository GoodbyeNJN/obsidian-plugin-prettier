import type { ReadonlyTuple } from "type-fest";

export const versionStrToNum = (str: string) => {
    const [major, minor, patch] = str.split(".").map(Number) as unknown as ReadonlyTuple<number, 3>;

    return major * 10000 + minor * 100 + patch;
};
