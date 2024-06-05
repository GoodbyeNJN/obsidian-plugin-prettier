import { Plugin } from "obsidian";

export default class PrettierPlugin extends Plugin {
    onload() {
        console.log("loading plugin");
    }

    onunload() {
        console.log("unloading plugin");
    }
}
