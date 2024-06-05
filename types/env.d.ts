declare namespace NodeJS {
    interface ProcessEnv {
        /**
         * The path to the Obsidian vault.
         */
        readonly OBSIDIAN_VAULT_PATH?: string;
    }
}
