import { parsers } from "prettier/plugins/markdown";

import type { SupportLanguage } from "prettier";

declare module "prettier/plugins/markdown" {
    export const languages: SupportLanguage[];
}
