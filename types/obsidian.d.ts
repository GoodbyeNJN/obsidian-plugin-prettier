declare module "obsidian" {
    export class Commands {
        commands: Record<string, Command>;
        editorCommands: Record<string, Command>;

        executeCommandById: (id: string) => boolean;
    }

    interface App {
        commands: Commands;
    }

    interface Plugin extends Component {
        app: App;
    }
}

declare global {
    interface Window {
        CodeMirrorAdapter: {
            commands: {
                save: () => void;
            };
        };
    }
}

export {};
