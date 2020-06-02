#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Filesystem
const { readdir, readFile } = require("fs").promises;
const path_1 = require("path");
const rimraf_1 = __importDefault(require("rimraf"));
const log = __importStar(require("cli-block"));
const ncp = require("ncp").ncp;
const prettier = require("prettier");
// Functionality
const settings_1 = require("./settings");
const utils_1 = require("./utils");
const getFileTree = (dir, settings) => __awaiter(void 0, void 0, void 0, function* () {
    const dirents = yield readdir(dir, { withFileTypes: true });
    const files = yield Promise.all(dirents.map((dirent) => {
        const res = path_1.resolve(dir, dirent.name);
        const ext = path_1.extname(res);
        if ((settings.extensions.includes(ext) || dirent.isDirectory()) &&
            !settings.excludeFolders.includes(dirent.name))
            return dirent.isDirectory()
                ? getFileTree(res, settings)
                : { name: path_1.basename(res).replace(ext, ""), path: res, ext: ext };
        else
            return null;
    }));
    return Array.prototype.concat(...files).filter((r) => r !== null);
});
const getFiles = (settings) => __awaiter(void 0, void 0, void 0, function* () {
    const files = yield getFileTree(settings.input, settings);
    return Object.assign(Object.assign({}, settings), { files: files });
});
const fileData = (settings) => __awaiter(void 0, void 0, void 0, function* () {
    yield utils_1.asyncForEach(settings.files, (file) => __awaiter(void 0, void 0, void 0, function* () {
        file.data = yield getFileData(file);
    }));
    return Object.assign({}, settings);
});
const getFileData = (file) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let fileData = yield readFile(file.path).then((res) => res.toString());
        return fileData;
    }
    catch (err) {
        console.log(err);
    }
});
const getPackageInformation = (settings) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("test");
    try {
        let PackageData = yield readFile("package.json").then((res) => res.toString());
        console.log(PackageData);
        return Object.assign(Object.assign({}, settings), { package: JSON.parse(PackageData) });
    }
    catch (err) {
        console.log(err);
    }
    return settings;
});
const toHtml = (settings) => __awaiter(void 0, void 0, void 0, function* () {
    yield utils_1.asyncForEach(settings.files, (file) => __awaiter(void 0, void 0, void 0, function* () {
        switch (file.ext) {
            case ".md":
                const markdownData = yield utils_1.mdToHtml(file);
                file.meta = markdownData.meta;
                file.html = markdownData.document;
                break;
            case ".html":
                file.meta = {};
                file.html = file.data;
                break;
        }
    }));
    return Object.assign(Object.assign({}, settings), { files: settings.files });
});
const getLayout = (settings) => __awaiter(void 0, void 0, void 0, function* () {
    let layoutFile = "";
    if (settings.layout.includes(".hbs") || settings.layout.includes(".html")) {
        layoutFile = yield readFile(path_1.join(process.cwd(), settings.layout)).then((res) => res.toString());
    }
    else {
        layoutFile = yield readFile(path_1.join(__dirname, "../", `template/${settings.layout}.hbs`)).then((res) => res.toString());
    }
    return Object.assign(Object.assign({}, settings), { layout: layoutFile });
});
const setMeta = (settings) => __awaiter(void 0, void 0, void 0, function* () {
    const files = yield Promise.all(settings.files.map((file) => __awaiter(void 0, void 0, void 0, function* () {
        return (file = Object.assign(Object.assign({}, file), { title: yield utils_1.getTitle(file), route: utils_1.makeRoute(file, settings), destpath: utils_1.makePath(file, settings), filename: utils_1.makeFileName(file) }));
    }))).then((res) => res);
    return Object.assign(Object.assign({}, settings), { files: files });
});
const getStyles = (settings) => {
    let styles = [];
    if (settings.theme && !settings.theme.includes("http")) {
        styles.push(`https://coat.guyn.nl/theme/${settings.theme}.css`);
    }
    // To Embeddable link scripts
    const stylesScripts = styles
        .map((s) => (s = `<link rel="stylesheet" type="text/css" href="${s}"/>`))
        .join("");
    return Object.assign(Object.assign({}, settings), { styles: stylesScripts });
};
const getScripts = (settings) => {
    let scripts = [];
    const scriptScripts = scripts
        .map((s) => (s = `<script type="text/javascript" src="${s}"></script>`))
        .join("");
    return Object.assign(Object.assign({}, settings), { scripts: scriptScripts });
};
const createFolder = (settings) => __awaiter(void 0, void 0, void 0, function* () {
    if (settings.cleanBefore)
        rimraf_1.default.sync(settings.output);
});
const createFiles = (settings) => __awaiter(void 0, void 0, void 0, function* () {
    const template = utils_1.Handlebars.compile(settings.layout);
    log.BLOCK_MID("Creating pages");
    yield utils_1.asyncForEach(settings.files, (file) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const currentLink = file.route.replace("index.html", "");
            const contents = template({
                title: file.title,
                content: file.html,
                currentLink: currentLink,
                currentId: currentLink.replace(/\//g, " ").trim().replace(/\s+/g, "-"),
                styles: settings.styles ? settings.styles : null,
                scripts: settings.scripts ? settings.scripts : null,
                navigation: settings.navigation,
                package: settings.package ? settings.package : null,
            });
            yield utils_1.writeThatFile(file, prettier.format(contents, { parser: "html" }));
        }
        catch (err) {
            console.log(err);
        }
    }));
});
const copyFolders = (settings) => __awaiter(void 0, void 0, void 0, function* () {
    if (settings.copy.length > 0) {
        log.BLOCK_MID("Copy folders");
        yield utils_1.asyncForEach(settings.copy, (folder) => __awaiter(void 0, void 0, void 0, function* () {
            yield ncp(folder, settings.output + "/" + folder, (err) => {
                if (!err)
                    log.BLOCK_LINE_SUCCESS(folder);
            });
        }));
    }
});
const start = (settings) => __awaiter(void 0, void 0, void 0, function* () {
    return settings;
});
const buildNavigation = (settings) => __awaiter(void 0, void 0, void 0, function* () {
    let nav = [];
    settings.files.forEach((file) => {
        const link = file.route.replace("index.html", "");
        const linkPath = link.substr(1, link.length - 2).split("/");
        const parent = linkPath[linkPath.length - 2]
            ? linkPath[linkPath.length - 2]
            : "";
        nav.push({
            name: file.title,
            link: link,
            path: linkPath,
            self: linkPath[linkPath.length - 1],
            parent: file.meta.parent ? file.meta.parent : parent,
        });
    });
    let newNav = [];
    if (!settings.flat)
        nav
            .filter((item) => item.parent == "")
            .forEach((item) => {
            newNav.push({
                name: item.name,
                link: item.link,
                children: nav
                    .filter((subitem) => subitem.parent === item.self && item.self !== "")
                    .map((mapitem) => ({
                    name: mapitem.name,
                    link: mapitem.link,
                })),
            });
        });
    return Object.assign(Object.assign({}, settings), { navigation: settings.flat ? nav : newNav });
});
start(settings_1.settings())
    .then((s) => {
    log.START("Creating Your documentation");
    log.BLOCK_START();
    log.BLOCK_LINE("Dokkie is now building your documentation");
    settings_1.logSettings(s);
    return s;
})
    .then(getFiles)
    .then(fileData)
    .then(getPackageInformation)
    .then(toHtml)
    .then(setMeta)
    .then(getLayout)
    .then(getStyles)
    .then(getScripts)
    .then(buildNavigation)
    .then((s) => __awaiter(void 0, void 0, void 0, function* () {
    yield createFolder(s);
    yield createFiles(s);
    yield copyFolders(s);
    return s;
}))
    .then(() => {
    setTimeout(() => {
        log.BLOCK_END("Done :)");
    }, 10);
});
//# sourceMappingURL=index.js.map