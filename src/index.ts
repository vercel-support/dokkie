#!/usr/bin/env node

// Filesystem
const { readdir, readFile } = require("fs").promises;
import { basename, extname, resolve, join } from "path";
import rimraf from "rimraf";
import * as log from "cli-block";
const ncp = require("ncp").ncp;
import prettier from "prettier";

// Functionality
import { settings, logSettings } from "./settings";
import { ISettings, IFile, INavigation } from "./types";

import {
	writeThatFile,
	asyncForEach,
	getTitle,
	mdToHtml,
	makeFileName,
	makeRoute,
	makePath,
	Handlebars,
} from "./utils";

const getFileTree = async (
	dir: string,
	settings: ISettings
): Promise<IFile[]> => {
	const dirents = await readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		dirents.map((dirent: any) => {
			const res = resolve(dir, dirent.name);
			const ext = extname(res);
			if (
				(settings.extensions.includes(ext) || dirent.isDirectory()) &&
				!settings.excludeFolders.includes(dirent.name)
			)
				return dirent.isDirectory()
					? getFileTree(res, settings)
					: { name: basename(res).replace(ext, ""), path: res, ext: ext };
			else return null;
		})
	);
	return Array.prototype.concat(...files).filter((r) => r !== null);
};

const getFiles = async (settings: ISettings): Promise<ISettings> => {
	const files = await getFileTree(settings.input, settings);
	return { ...settings, files: files };
};

const fileData = async (settings: ISettings): Promise<ISettings> => {
	await asyncForEach(settings.files, async (file) => {
		file.data = await getFileData(file);
	});
	return { ...settings };
};

const getFileData = async (file: IFile): Promise<IFile> => {
	try {
		let fileData = await readFile(file.path).then((res) => res.toString());
		return fileData;
	} catch (err) {
		console.log(err);
	}
};

const getPackageInformation = async (
	settings: ISettings
): Promise<ISettings> => {
	try {
		let PackageData = await readFile("package.json").then((res) =>
			res.toString()
		);
		return { ...settings, package: JSON.parse(PackageData) };
	} catch (err) {
		console.log(err);
	}
	return settings;
};

const loadLocalConfig = async (settings: ISettings): Promise<ISettings> => {
	try {
		let configData = await readFile("dokkie.config.json").then((res) =>
			JSON.parse(res.toString())
		);
		log.BLOCK_MID("Local configuration");
		log.BLOCK_SETTINGS(configData);
		return { ...settings, localConfig: configData };
	} catch (err) {
		// console.log(err);
	}
	return settings;
};

const toHtml = async (settings: ISettings): Promise<ISettings> => {
	await asyncForEach(settings.files, async (file: IFile) => {
		switch (file.ext) {
			case ".md":
				const markdownData = await mdToHtml(file);
				file.meta = markdownData.meta;
				file.html = markdownData.document;
				break;
			case ".html":
				file.meta = {};
				file.html = file.data;
				break;
		}
	});
	return { ...settings, files: settings.files };
};

const setLocalConfig = (settings: ISettings): ISettings => {
	if (settings.localConfig) {
		if (settings.localConfig.input) settings.input = settings.localConfig.input;
		if (settings.localConfig.output)
			settings.output = settings.localConfig.output;
		if (settings.localConfig.layout)
			settings.layout = settings.localConfig.layout;
		if (settings.localConfig.cleanBefore)
			settings.cleanBefore = settings.localConfig.cleanBefore;
		if (settings.localConfig.theme) settings.theme = settings.localConfig.theme;
		if (settings.localConfig.extensions)
			settings.extensions = settings.localConfig.extensions;
		if (settings.localConfig.excludeFolders)
			settings.excludeFolders = settings.localConfig.excludeFolders;
		if (settings.localConfig.copy) settings.copy = settings.localConfig.copy;
		if (settings.localConfig.strip) settings.strip = settings.localConfig.strip;
		if (settings.localConfig.flat) settings.flat = settings.localConfig.flat;
		if (settings.localConfig.showNavigation)
			settings.showNavigation = settings.localConfig.showNavigation;
	}

	return settings;
};
const getLayout = async (settings: ISettings): Promise<ISettings> => {
	let layoutFile = "";
	if (settings.layout.includes(".hbs") || settings.layout.includes(".html")) {
		layoutFile = await readFile(
			join(process.cwd(), settings.layout)
		).then((res) => res.toString());
	} else {
		layoutFile = await readFile(
			join(__dirname, "../", `template/${settings.layout}.hbs`)
		).then((res) => res.toString());
	}
	return { ...settings, layout: layoutFile };
};

const setMeta = async (settings: ISettings): Promise<ISettings> => {
	const files = await Promise.all(
		settings.files.map(
			async (file: IFile) =>
				(file = {
					...file,
					title: await getTitle(file),
					route: makeRoute(file, settings),
					destpath: makePath(file, settings),
					filename: makeFileName(file),
				})
		)
	).then((res) => res);

	return { ...settings, files: files };
};

const getStyles = (settings: ISettings): ISettings => {
	let styles = [];

	if (settings.theme && !settings.theme.includes("http")) {
		styles.push(`https://coat.guyn.nl/theme/${settings.theme}.css`);
	}

	// If there are addable stylesheets available
	if (settings.localConfig?.add?.stylesheets)
		styles = styles.concat(settings.localConfig.add.stylesheets);

	// If there are overruling stylesheets
	if (settings.localConfig?.overrule?.stylesheets)
		styles = settings.localConfig?.overrule?.stylesheets;

	// To Embeddable link scripts
	const stylesScripts = styles
		.map((s) => (s = `<link rel="stylesheet" type="text/css" href="${s}"/>`))
		.join("");

	return {
		...settings,
		styles: stylesScripts,
	};
};

const getScripts = (settings: ISettings): ISettings => {
	let scripts = [];
	// If there are addable stylesheets available
	if (settings.localConfig?.add?.scripts)
		scripts = scripts.concat(settings.localConfig.add.scripts);

	// If there are overruling stylesheets
	if (settings.localConfig?.overrule?.scripts)
		scripts = settings.localConfig.overrule.scripts;

	const scriptScripts = scripts
		.map((s) => (s = `<script type="text/javascript" src="${s}"></script>`))
		.join("");
	return {
		...settings,
		scripts: scriptScripts,
	};
};
const createFolder = async (settings: ISettings): Promise<void> => {
	if (settings.cleanBefore) rimraf.sync(settings.output);
};

const createFiles = async (settings: ISettings): Promise<void> => {
	const template = Handlebars.compile(settings.layout);

	log.BLOCK_MID("Creating pages");
	await asyncForEach(settings.files, async (file: IFile) => {
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
				headerNavigation: settings.showNavigation.includes("header"),
				footerNavigation: settings.showNavigation.includes("footer"),
				sidebarNavigation: settings.showNavigation.includes("sidebar"),
			});
			await writeThatFile(file, prettier.format(contents, { parser: "html" }));
		} catch (err) {
			console.log(err);
		}
	});
};
const copyFolders = async (settings: ISettings): Promise<void> => {
	if (settings.copy.length > 0) {
		log.BLOCK_MID("Copy folders");
		await asyncForEach(settings.copy, async (folder) => {
			await ncp(folder, settings.output + "/" + folder, (err) => {
				if (!err) log.BLOCK_LINE_SUCCESS(folder);
			});
		});
	}
};
const start = async (settings: ISettings): Promise<ISettings> => {
	return settings;
};

const buildNavigation = async (settings: ISettings): Promise<ISettings> => {
	let nav: INavigation[] = [];

	settings.files.forEach((file: IFile) => {
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
						.filter(
							(subitem) => subitem.parent === item.self && item.self !== ""
						)
						.map((mapitem) => ({
							name: mapitem.name,
							link: mapitem.link,
						})),
				});
			});

	return { ...settings, navigation: settings.flat ? nav : newNav };
};

start(settings())
	.then((s) => {
		log.START("Creating Your documentation");
		log.BLOCK_START();
		log.BLOCK_LINE("Dokkie is now building your documentation");
		logSettings(s);
		return s;
	})
	.then(loadLocalConfig)
	.then(setLocalConfig)
	.then(getFiles)
	.then(fileData)
	.then(getPackageInformation)
	.then(toHtml)
	.then(setMeta)
	.then(getLayout)
	.then(getStyles)
	.then(getScripts)
	.then(buildNavigation)
	.then(async (s) => {
		await createFolder(s);
		await createFiles(s);
		await copyFolders(s);
		return s;
	})
	.then(() => {
		setTimeout(() => {
			log.BLOCK_END("Done :)");
		}, 10);
	});
