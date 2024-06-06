import { App, Plugin } from "obsidian";

declare module "obsidian" {
    export class Commands {
        commands: Record<string, Command>;
        editorCommands: Record<string, Command>;
    }

    interface App {
        commands: Commands;
    }

    interface Plugin extends Component {
        app: App;
    }
}
