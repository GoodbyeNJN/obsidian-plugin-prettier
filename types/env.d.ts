declare namespace NodeJS {
    interface ProcessEnv {
        /**
         * The path to the plugins directory in an Obsidian vault.
         */
        readonly OBSIDIAN_PLUGINS_DIR?: string;

        /**
         * The plugin manifest. Injected by Rollup at build time.
         */
        readonly MANIFEST: Manifest;
    }
}
