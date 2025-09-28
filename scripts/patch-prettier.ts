#!/usr/bin/env -S node --disable-warning=ExperimentalWarning

import { err, ok, safeTry } from "@goodbyenjn/utils/result";
import esquery from "esquery";
import MagicString from "magic-string-stack";
import { parseAsync } from "oxc-parser";

import { patch } from "./utils.ts";

import type { Patch } from "./utils.ts";
import type { FunctionDeclaration, Node, ObjectExpression, Property } from "estree";

const baseSelector =
    ":matches(Program, Program > ExpressionStatement > CallExpression > FunctionExpression > BlockStatement)";

const parse = async (filepath: string, content: string) => {
    const result = await parseAsync(filepath, content, {
        range: true,
        sourceType: "module",
    });

    if (result.errors.length > 0) {
        return err(result.errors).context(`Failed to parse file: ${filepath}`);
    }

    return ok(result.program);
};

const transformPrettierStandalone = (magicString: MagicString, ast: Node) => {
    /*
    Looking for code like this:

    var Nn = {
        astFormat: "estree",
        printer: {},
        originalText: void 0,
        locStart: null,
        locEnd: null,
    };
     */
    const keys = ["astFormat", "printer", "originalText", "locStart", "locEnd"];

    const selector = [
        baseSelector,
        "VariableDeclaration",
        "VariableDeclarator",
        "ObjectExpression[properties.length=5]",
    ].join(" > ");

    let offset = -1;
    for (const ObjectExpression of esquery(ast, selector) || []) {
        const { properties } = ObjectExpression as ObjectExpression;

        const condition = properties.every(
            property =>
                property.type === "Property" &&
                property.key.type === "Identifier" &&
                keys.includes(property.key.name),
        );
        if (!condition) continue;

        offset = properties[0]!.range![0];

        break;
    }

    if (offset === -1) return err("Failed to find the target property node");

    magicString.prependLeft(offset, "__languageMappings: new Map(),");

    return ok();
};

const transformPrettierMarkdown = (magicString: MagicString, ast: Node) => {
    /*
    Looking for code like this:

    function tf(e, r) {
        let { node: t } = e;
        if (t.type === "code" && t.lang !== null) {
            let n = wi(r, { language: t.lang });
            ...
        }
        ...
    }
     */
    const functionSelector = [baseSelector, "FunctionDeclaration[params.length=2]"].join(" > ");

    let secondParamName = "";
    let nodePropertyName = "";
    let insertOffset = -1;
    let overwriteStart = -1;
    let overwriteEnd = -1;
    for (const FunctionDeclaration of esquery(ast, functionSelector) || []) {
        let firstParamName = "";
        {
            const { params } = FunctionDeclaration as FunctionDeclaration;
            const condition = params.every(param => param.type === "Identifier");
            if (!condition) continue;

            firstParamName = params[0]!.name;
            secondParamName = params[1]!.name;
        }

        {
            const propertySelector = [
                "BlockStatement",
                "VariableDeclaration",
                `VariableDeclarator:has(> Identifier[name=${firstParamName}])`,
                "ObjectPattern[properties.length=1]:has(> Property[key.name='node'])",
                "Property:first-child",
            ].join(" > ");

            const [Property, ...nodes] = esquery(FunctionDeclaration, propertySelector) || [];
            if (!Property || nodes.length !== 0) continue;

            const { value } = Property as Property;
            if (value.type !== "Identifier") continue;

            nodePropertyName = value.name;
        }

        {
            const leftBinaryExpressionSelector = `BinaryExpression[operator='===']${[
                `MemberExpression[object.name=${nodePropertyName}]}[property.name='type']`,
                "Literal[value='code']",
            ].map(selector => `:has(> ${selector})`)}`;
            const rightBinaryExpressionSelector = `BinaryExpression[operator='!==']${[
                `MemberExpression[object.name=${nodePropertyName}]}[property.name='lang']`,
                "Literal[value=null]",
            ].map(selector => `:has(> ${selector})`)}`;
            const testSelector = `LogicalExpression[operator='&&']${[
                leftBinaryExpressionSelector,
                rightBinaryExpressionSelector,
            ].map(selector => `:has(> ${selector})`)}`;
            const variableDeclarationSelector = [
                "BlockStatement",
                `IfStatement:has(> ${testSelector})`,
                "BlockStatement",
                "VariableDeclaration:first-child",
            ].join(" > ");

            const [VariableDeclaration, ...nodes] =
                esquery(FunctionDeclaration, variableDeclarationSelector) || [];
            if (!VariableDeclaration || nodes.length !== 0) continue;

            insertOffset = VariableDeclaration.range![0];

            {
                const propertySelector = [
                    "VariableDeclarator",
                    "CallExpression[arguments.length=2]:has(> Identifier)",
                    "ObjectExpression[properties.length=1]:has(> Property[key.name='language'])",
                    "Property:first-child",
                ].join(" > ");

                const [Property, ...nodes2] = esquery(VariableDeclaration, propertySelector) || [];
                if (!Property || nodes2.length !== 0) continue;

                overwriteStart = Property.range![0];
                overwriteEnd = Property.range![1];

                break;
            }
        }
    }

    magicString.prependLeft(
        insertOffset,
        `const language = ${secondParamName}.__languageMappings?.get(${nodePropertyName}.lang) || ${nodePropertyName}.lang;`,
    );
    magicString.overwrite(overwriteStart, overwriteEnd, "language");

    return ok();
};

const patches: Patch[] = [
    {
        pattern: "standalone.{js,mjs}",
        handler: (filepath, content) =>
            safeTry(async function* () {
                const ast = yield* await parse(filepath, content);
                const magicString = new MagicString(content);

                yield* transformPrettierStandalone(magicString, ast as Node);

                return ok(magicString.toString());
            }),
    },
    {
        pattern: "plugins/markdown.{js,mjs}",
        handler: (filepath, content) =>
            safeTry(async function* () {
                const ast = yield* await parse(filepath, content);
                const magicString = new MagicString(content);

                transformPrettierMarkdown(magicString, ast as Node);

                return ok(magicString.toString());
            }),
    },
];

patch("prettier", patches);
