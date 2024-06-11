declare namespace NodeJS {
    interface ProcessEnv {
        /**
         * The path to the plugins directory in an Obsidian vault.
         */
        readonly OBSIDIAN_PLUGINS_DIR?: string;
    }
}
