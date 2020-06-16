import { ISettings } from "./types";
export declare const defaultSettings: {
    type: string;
    input: string;
    output: string;
    layout: string;
    clean: boolean;
    theme: string;
    ext: string[];
    exclude: string[];
    copy: any[];
    strip: string[];
    codeHighlight: boolean;
    projectTitle: string;
    favicon: string;
    flatNavigation: boolean;
    skip: any[];
    showNavigation: {
        name: string;
        mobile: boolean;
        desktop: boolean;
    }[];
    config: string;
    debug: boolean;
    enhance: string[];
};
export declare const settings: () => ISettings;
export declare const getDokkiePackage: (settings: ISettings) => Promise<ISettings>;
export declare const setAlternativeDefaults: (settings: ISettings) => Promise<ISettings>;
