import tsconfigPaths from "vite-tsconfig-paths";
import { defaultExclude, defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        restoreMocks: true,
        exclude: [...defaultExclude, "prettier/**"],
    },
    plugins: [tsconfigPaths()],
});
