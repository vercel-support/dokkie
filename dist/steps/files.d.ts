import { ISettings, IFile } from "../types";
export declare const getFileTree: (dir: string, settings: ISettings) => Promise<IFile[]>;
export declare const getFiles: (settings: ISettings) => Promise<ISettings>;
export declare const fileData: (settings: ISettings) => Promise<ISettings>;
export declare const getFileData: (file: IFile) => Promise<IFile>;
export declare const concatPartials: (settings: ISettings) => Promise<ISettings>;
export declare const cleanupFilePathAfterOrder: (settings: ISettings) => Promise<ISettings>;
export declare const setFileDate: (settings: ISettings) => Promise<ISettings>;
