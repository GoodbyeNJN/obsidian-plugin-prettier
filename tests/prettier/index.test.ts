import pluginBabel from "prettier-mod/plugins/babel";
import pluginEstree from "prettier-mod/plugins/estree";
import pluginMarkdown from "prettier-mod/plugins/markdown";
import prettier from "prettier-mod/standalone";

import type { Options } from "prettier-mod";

const noscript = `
\`\`\`noscript
const a=1
\`\`\`
`.trim();

const javascript = `
\`\`\`javascript
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
        const formatted = await prettier.format(noscript, { ...options, __languageMappings });

        expect(formatted).toMatchInlineSnapshot(`
          "\`\`\`noscript
          const a = 1;
          \`\`\`
          "
        `);
    });

    test.concurrent("Without mappings", async ({ expect }) => {
        const formatted = await prettier.format(noscript, options);

        expect(formatted).toMatchInlineSnapshot(`
          "\`\`\`noscript
          const a=1
          \`\`\`
          "
        `);
    });

    test.concurrent("With language filter empty whitelist (deny all)", async ({ expect }) => {
        const __languageFilters = { type: "whitelist", list: new Set() };
        const formatted = await prettier.format(javascript, { ...options, __languageFilters });

        expect(formatted).toMatchInlineSnapshot(`
          "\`\`\`javascript
          const a=1
          \`\`\`
          "
        `);
    });

    test.concurrent("With language filter non-empty whitelist", async ({ expect }) => {
        const __languageFilters = { type: "whitelist", list: new Set(["javascript"]) };
        const formatted = await prettier.format(javascript, { ...options, __languageFilters });

        expect(formatted).toMatchInlineSnapshot(`
          "\`\`\`javascript
          const a = 1;
          \`\`\`
          "
        `);
    });

    test.concurrent("With language filter empty blacklist (allow all)", async ({ expect }) => {
        const __languageFilters = { type: "blacklist", list: new Set() };
        const formatted = await prettier.format(javascript, { ...options, __languageFilters });

        expect(formatted).toMatchInlineSnapshot(`
          "\`\`\`javascript
          const a = 1;
          \`\`\`
          "
        `);
    });

    test.concurrent("With language filter non-empty blacklist", async ({ expect }) => {
        const __languageFilters = { type: "blacklist", list: new Set(["javascript"]) };
        const formatted = await prettier.format(javascript, { ...options, __languageFilters });

        expect(formatted).toMatchInlineSnapshot(`
          "\`\`\`javascript
          const a=1
          \`\`\`
          "
        `);
    });

    test.concurrent("Without language filter", async ({ expect }) => {
        const formatted = await prettier.format(javascript, options);

        expect(formatted).toMatchInlineSnapshot(`
          "\`\`\`javascript
          const a = 1;
          \`\`\`
          "
        `);
    });

    test.concurrent(
        "With both mappings and filter (filter should take precedence, whitelist)",
        async ({ expect }) => {
            const __languageMappings = new Map([["noscript", "javascript"]]);
            const __languageFilters = { type: "whitelist", list: new Set(["javascript"]) };
            const formatted = await prettier.format(noscript, {
                ...options,
                __languageMappings,
                __languageFilters,
            });

            expect(formatted).toMatchInlineSnapshot(`
              "\`\`\`noscript
              const a=1
              \`\`\`
              "
            `);
        },
    );

    test.concurrent(
        "With both mappings and filter (filter should take precedence, blacklist)",
        async ({ expect }) => {
            const __languageMappings = new Map([["noscript", "javascript"]]);
            const __languageFilters = { type: "blacklist", list: new Set(["noscript"]) };
            const formatted = await prettier.format(noscript, {
                ...options,
                __languageMappings,
                __languageFilters,
            });

            expect(formatted).toMatchInlineSnapshot(`
              "\`\`\`noscript
              const a=1
              \`\`\`
              "
            `);
        },
    );
});
