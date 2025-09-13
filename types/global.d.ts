import "@goodbyenjn/utils/global-types";

declare global {
    interface Manifest {
        id: string;
        name: string;
        version: string;
        author: string;
        authorUrl: string;
        description: string;
        isDesktopOnly: boolean;
        minAppVersion: string;
    }
}
