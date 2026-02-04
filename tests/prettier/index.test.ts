import pluginBabel from "prettier-mod/plugins/babel";
import pluginEstree from "prettier-mod/plugins/estree";
import pluginMarkdown from "prettier-mod/plugins/markdown";
import prettier from "prettier-mod/standalone";

import type { Options } from "prettier-mod";

const text = `
\`\`\`noscript
const a=1
\`\`\`
`.trim();

const options: Options = {
    parser: "markdown",
    plugins: [pluginBabel, pluginEstree, pluginMarkdown],
    embeddedLanguageFormatting: "auto",
};

describe("Prettier with patch", () => {
    test.concurrent("With mappings", async ({ expect }) => {
        const __languageMappings = new Map([["noscript", "javascript"]]);
        const formatted = await prettier.format(text, { ...options, __languageMappings });

        expect(formatted).toMatchInlineSnapshot(`
          "\`\`\`noscript
          const a = 1;
          \`\`\`
          "
        `);
    });

    test.concurrent("Without mappings", async ({ expect }) => {
        const formatted = await prettier.format(text, options);

        expect(formatted).toMatchInlineSnapshot(`
          "\`\`\`noscript
          const a=1
          \`\`\`
          "
        `);
    });
});
