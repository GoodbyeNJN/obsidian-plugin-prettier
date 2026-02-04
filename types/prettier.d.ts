import type { SupportLanguage } from "prettier-mod";

declare module "prettier-mod/plugins/markdown" {
    export const languages: SupportLanguage[];
}
