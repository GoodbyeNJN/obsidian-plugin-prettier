export const KEY = "plugin-prettier";

export const logger = (...params: Parameters<typeof console.log>) =>
    console.log(`[${KEY}]`, ...params);

export const timer = () => {
    const start = performance.now();

    return () => performance.now() - start;
};
