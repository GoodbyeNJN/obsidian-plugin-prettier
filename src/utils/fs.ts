import fs, { promises as fsp } from "node:fs";
import path from "node:path";

import { isEmpty, isNumber, isPlainObject, isString } from "remeda";

const isPathLike = (data: unknown): data is fs.PathLike =>
    typeof data === "string" || data instanceof Buffer || data instanceof URL;

const isMode = (data: unknown): data is fs.Mode => isNumber(data) || isString(data);

const isNoSuchFileError = (error: unknown): error is NodeJS.ErrnoException => {
    const { errno, code } = error as NodeJS.ErrnoException;

    return errno === -2 && code === "ENOENT";
};

const isFileExistsError = (error: unknown): error is NodeJS.ErrnoException => {
    const { errno, code } = error as NodeJS.ErrnoException;

    return errno === -17 && code === "EEXIST";
};

const pathLikeToPath = (pathLike: fs.PathLike) =>
    path.resolve(pathLike instanceof URL ? pathLike.pathname : pathLike.toString());

type Type = "sync" | "async";
type Impl<T extends Type, FS, FA> = T extends "sync" ? FS : T extends "async" ? FA : never;

const implReadFile = <T extends Type>(type: T, safe?: boolean) => {
    interface EncodingOptions {
        encoding: BufferEncoding;
    }

    type SyncParams = Parameters<typeof fs.readFileSync>;
    type AsyncParams = Parameters<typeof fsp.readFile>;
    type SyncImpl = (...params: SyncParams) => string;
    type AsyncImpl = (...params: AsyncParams) => Promise<string>;

    const normalizeParams = <T extends SyncParams | AsyncParams>(params: T) => {
        const [path, encodingOrOptions] = params;

        let options: EncodingOptions = { encoding: "utf-8" };
        if (isPlainObject(encodingOrOptions)) {
            options = { encoding: "utf-8", ...encodingOrOptions };
        } else if (isString(encodingOrOptions)) {
            options = { encoding: encodingOrOptions };
        }

        return [path, options] as [T[0], EncodingOptions];
    };

    const syncImpl: SyncImpl = (...params) => {
        if (!safe) {
            return fs.readFileSync(...normalizeParams(params));
        }

        try {
            return fs.readFileSync(...normalizeParams(params));
        } catch (error) {
            if (isNoSuchFileError(error)) return "";

            throw error;
        }
    };

    const asyncImpl: AsyncImpl = async (...params) => {
        if (!safe) {
            return await fsp.readFile(...normalizeParams(params));
        }

        try {
            return await fsp.readFile(...normalizeParams(params));
        } catch (error) {
            if (isNoSuchFileError(error)) return "";

            throw error;
        }
    };

    const impl = (type === "sync" ? syncImpl : asyncImpl) as Impl<T, SyncImpl, AsyncImpl>;

    return impl;
};
export const readFile = implReadFile("async");
export const readFileSync = implReadFile("sync");
export const safeReadFile = implReadFile("async", true);
export const safeReadFileSync = implReadFile("sync", true);

const implWriteFile = <T extends Type>(type: T, safe?: boolean) => {
    type SyncParams = Parameters<typeof fs.writeFileSync>;
    type AsyncParams = Parameters<typeof fsp.writeFile>;
    type SyncImpl = (...params: SyncParams) => void;
    type AsyncImpl = (...params: AsyncParams) => Promise<void>;

    const syncImpl: SyncImpl = (...params) => {
        if (!safe) {
            return fs.writeFileSync(...params);
        }

        try {
            return fs.writeFileSync(...params);
        } catch (error) {
            const [file] = params;
            if (isNoSuchFileError(error) && isPathLike(file)) {
                const dirpath = path.dirname(pathLikeToPath(file));
                safeMkdirSync(dirpath);

                return syncImpl(...params);
            }

            throw error;
        }
    };

    const asyncImpl: AsyncImpl = async (...params) => {
        if (!safe) {
            return await fsp.writeFile(...params);
        }

        try {
            return await fsp.writeFile(...params);
        } catch (error) {
            const [file] = params;
            if (isNoSuchFileError(error) && isPathLike(file)) {
                const dirpath = path.dirname(pathLikeToPath(file));
                await safeMkdir(dirpath);

                return await asyncImpl(...params);
            }

            throw error;
        }
    };

    const impl = (type === "sync" ? syncImpl : asyncImpl) as Impl<T, SyncImpl, AsyncImpl>;

    return impl;
};
export const writeFile = implWriteFile("async");
export const writeFileSync = implWriteFile("sync");
export const safeWriteFile = implWriteFile("async", true);
export const safeWriteFileSync = implWriteFile("sync", true);

const implReadJson = <T extends Type, S extends boolean>(type: T, safe: S) => {
    type SyncParams = Parameters<typeof readFileSync>;
    type AsyncParams = Parameters<typeof readFile>;
    type UnsafeSyncImpl = <T = any>(...params: SyncParams) => T;
    type UnsafeAsyncImpl = <T = any>(...params: AsyncParams) => Promise<T>;
    type SafeSyncImpl = <T = any>(...params: SyncParams) => T | null;
    type SafeAsyncImpl = <T = any>(...params: AsyncParams) => Promise<T | null>;
    type SyncImpl = S extends true ? SafeSyncImpl : UnsafeSyncImpl;
    type AsyncImpl = S extends true ? SafeAsyncImpl : UnsafeAsyncImpl;

    const syncImpl = ((...params) => {
        if (!safe) {
            const content = readFileSync(...params);
            return JSON.parse(content);
        }

        const content = safeReadFileSync(...params);
        if (!content) return null;

        try {
            return JSON.parse(content);
        } catch {
            return null;
        }
    }) as SyncImpl;

    const asyncImpl = (async (...params) => {
        if (!safe) {
            const content = await readFile(...params);
            return JSON.parse(content);
        }

        const content = await safeReadFile(...params);
        if (!content) return null;

        try {
            return JSON.parse(content);
        } catch {
            return null;
        }
    }) as AsyncImpl;

    const impl = (type === "sync" ? syncImpl : asyncImpl) as Impl<T, SyncImpl, AsyncImpl>;

    return impl;
};
export const readJson = implReadJson("async", false);
export const readJsonSync = implReadJson("sync", false);
export const safeReadJson = implReadJson("async", true);
export const safeReadJsonSync = implReadJson("sync", true);

const implWriteJson = <T extends Type>(type: T, safe?: boolean) => {
    type WriteFileSyncParams = Parameters<typeof writeFileSync>;
    type WriteFileAsyncParams = Parameters<typeof writeFile>;

    type Indent = number;
    type ObjectOptions<T> = Extract<T, fs.ObjectEncodingOptions> & {
        indent?: Indent;
    };
    type Options<T> = ObjectOptions<T> | BufferEncoding | Indent | null;

    type SyncParams = [
        file: WriteFileSyncParams[0],
        data: any,
        options?: Options<WriteFileSyncParams[2]>,
    ];
    type AsyncParams = [
        file: WriteFileAsyncParams[0],
        data: any,
        options?: Options<WriteFileAsyncParams[2]>,
    ];
    type SyncImpl = (...params: SyncParams) => void;
    type AsyncImpl = (...params: AsyncParams) => Promise<void>;

    const transformParams = <
        T extends SyncParams | AsyncParams,
        U extends WriteFileSyncParams | WriteFileAsyncParams,
    >(
        params: T,
    ) => {
        const [file, data, encodingOrIndentOrOptions] = params;

        let indent = 2;
        let options: U[2] = { encoding: "utf-8" };
        if (isPlainObject(encodingOrIndentOrOptions)) {
            const { indent: indentNum = 2, ...rest } =
                encodingOrIndentOrOptions as unknown as ObjectOptions<U[2]>;
            indent = indentNum;
            options = rest;
        } else if (isString(encodingOrIndentOrOptions)) {
            options = { encoding: encodingOrIndentOrOptions };
        } else if (isNumber(encodingOrIndentOrOptions)) {
            indent = encodingOrIndentOrOptions;
        }

        return [file, JSON.stringify(data, null, indent), options] as [U[0], U[1], U[2]];
    };

    const syncImpl: SyncImpl = (...params) => {
        return (safe ? safeWriteFileSync : writeFileSync)(
            ...transformParams<SyncParams, WriteFileSyncParams>(params),
        );
    };

    const asyncImpl: AsyncImpl = async (...params) => {
        return await (safe ? safeWriteFile : writeFile)(
            ...transformParams<AsyncParams, WriteFileAsyncParams>(params),
        );
    };

    const impl = (type === "sync" ? syncImpl : asyncImpl) as Impl<T, SyncImpl, AsyncImpl>;

    return impl;
};
export const writeJson = implWriteJson("async");
export const writeJsonSync = implWriteJson("sync");
export const safeWriteJson = implWriteJson("async", true);
export const safeWriteJsonSync = implWriteJson("sync", true);

const implExists = <T extends Type>(type: T) => {
    type SyncParams = Parameters<typeof fs.accessSync>;
    type AsyncParams = Parameters<typeof fsp.access>;
    type SyncImpl = (...params: SyncParams) => boolean;
    type AsyncImpl = (...params: AsyncParams) => Promise<boolean>;

    const syncImpl: SyncImpl = (...params) => {
        try {
            fs.accessSync(...params);
            return true;
        } catch {
            return false;
        }
    };

    const asyncImpl: AsyncImpl = async (...params) => {
        try {
            await fsp.access(...params);
            return true;
        } catch {
            return false;
        }
    };

    const impl = (type === "sync" ? syncImpl : asyncImpl) as Impl<T, SyncImpl, AsyncImpl>;

    return impl;
};
export const exists = implExists("async");
export const existsSync = implExists("sync");

const implMkdir = <T extends Type>(type: T, safe?: boolean) => {
    type SyncParams = Parameters<typeof fs.mkdirSync>;
    type AsyncParams = Parameters<typeof fsp.mkdir>;
    type SyncImpl = (...params: SyncParams) => string | undefined;
    type AsyncImpl = (...params: AsyncParams) => Promise<string | undefined>;

    const normalizeParams = <T extends SyncParams | AsyncParams>(params: T) => {
        const [dirpath, modeOrOptions] = params;

        let options: fs.MakeDirectoryOptions = { recursive: true };
        if (isPlainObject(modeOrOptions)) {
            options = { recursive: true, ...modeOrOptions };
        } else if (isMode(modeOrOptions)) {
            options = { recursive: true, mode: modeOrOptions };
        }

        return [dirpath, options] as [T[0], Required<T[1]>];
    };

    const syncImpl: SyncImpl = (...params) => {
        if (!safe) {
            return fs.mkdirSync(...normalizeParams(params));
        }

        try {
            return fs.mkdirSync(...normalizeParams(params));
        } catch (error) {
            if (isFileExistsError(error)) return;

            throw error;
        }
    };

    const asyncImpl: AsyncImpl = async (...params) => {
        if (!safe) {
            return await fsp.mkdir(...normalizeParams(params));
        }

        try {
            return await fsp.mkdir(...normalizeParams(params));
        } catch (error) {
            if (isFileExistsError(error)) return;

            throw error;
        }
    };

    const impl = (type === "sync" ? syncImpl : asyncImpl) as Impl<T, SyncImpl, AsyncImpl>;

    return impl;
};
export const mkdir = implMkdir("async");
export const mkdirSync = implMkdir("sync");
export const safeMkdir = implMkdir("async", true);
export const safeMkdirSync = implMkdir("sync", true);

const implRm = <T extends Type>(type: T) => {
    type SyncParams = Parameters<typeof fs.rmSync>;
    type AsyncParams = Parameters<typeof fsp.rm>;
    type SyncImpl = (...params: SyncParams) => void;
    type AsyncImpl = (...params: AsyncParams) => Promise<void>;

    const normalizeParams = <T extends SyncParams | AsyncParams>(params: T) => {
        const [path, maybeOptions] = params;

        let options: fs.RmOptions = { force: true, recursive: true };
        if (isPlainObject(maybeOptions)) {
            options = { force: true, recursive: true, ...maybeOptions };
        }

        return [path, options] as [T[0], Required<T[1]>];
    };

    const syncImpl: SyncImpl = (...params) => {
        return fs.rmSync(...normalizeParams(params));
    };

    const asyncImpl: AsyncImpl = async (...params) => {
        return await fsp.rm(...normalizeParams(params));
    };

    const impl = (type === "sync" ? syncImpl : asyncImpl) as Impl<T, SyncImpl, AsyncImpl>;

    return impl;
};
export const rm = implRm("async");
export const rmSync = implRm("sync");

const implCp = <T extends Type>(type: T) => {
    type SyncParams = Parameters<typeof fs.cpSync>;
    type AsyncParams = Parameters<typeof fsp.cp>;
    type SyncImpl = (...params: SyncParams) => void;
    type AsyncImpl = (...params: AsyncParams) => Promise<void>;

    const normalizeParams = <T extends SyncParams | AsyncParams>(params: T) => {
        const [source, destination, maybeOptions] = params;

        let options: fs.CopyOptions = { recursive: true };
        if (isPlainObject(maybeOptions)) {
            options = { recursive: true, ...maybeOptions };
        }

        return [source, destination, options] as [T[0], T[1], Required<T[2]>];
    };

    const syncImpl: SyncImpl = (...params) => {
        return fs.cpSync(...normalizeParams(params));
    };

    const asyncImpl: AsyncImpl = async (...params) => {
        return await fsp.cp(...normalizeParams(params));
    };

    const impl = (type === "sync" ? syncImpl : asyncImpl) as Impl<T, SyncImpl, AsyncImpl>;

    return impl;
};
export const cp = implCp("async");
export const cpSync = implCp("sync");

const implRmParent = <T extends Type>(type: T) => {
    type SyncImpl = (pathLike: fs.PathLike, options?: { recursive?: boolean }) => void;
    type AsyncImpl = (pathLike: fs.PathLike, options?: { recursive?: boolean }) => Promise<void>;

    const syncImpl: SyncImpl = (pathLike, options) => {
        rmSync(pathLike);

        let parent = path.dirname(pathLikeToPath(pathLike));

        do {
            const files = fs.readdirSync(parent);
            if (!isEmpty(files)) break;

            rmSync(parent);
            parent = path.dirname(parent);
        } while (options?.recursive);
    };

    const asyncImpl: AsyncImpl = async (pathLike, options = {}) => {
        await rm(pathLike);

        let parent = path.dirname(pathLikeToPath(pathLike));

        do {
            const files = await fsp.readdir(parent);
            if (!isEmpty(files)) break;

            await rm(parent);
            parent = path.dirname(parent);
        } while (options?.recursive);
    };

    const impl = (type === "sync" ? syncImpl : asyncImpl) as Impl<T, SyncImpl, AsyncImpl>;

    return impl;
};
export const rmParent = implRmParent("async");
export const rmParentSync = implRmParent("sync");
