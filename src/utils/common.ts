import { Notice } from "obsidian";

import { fmt } from "@/i18n";

export const KEY = "plugin-prettier";

export const logger = (...params: Parameters<typeof console.log>) =>
    console.log(`[${KEY}]`, ...params);

export const timer = () => {
    const start = performance.now();

    return () => performance.now() - start;
};

export const showNotice = (message: string | DocumentFragment, duration?: number) => {
    const notice = new Notice(message, duration);

    return notice;
};

export const withPerfNotice = async (fn: () => void | Promise<void>) => {
    const stop = timer();

    await fn();

    const time = stop() / 1000;
    if (time > 5) {
        showNotice(fmt("notice:format-too-slow", { time: time.toFixed(2) }));
    }
};
