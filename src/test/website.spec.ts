import {
	createPages,
	getLayout,
	filterHiddenPages,
	convertDataToHtml,
} from "../steps/page";
import {
	sectionPartials,
	concatPartials,
	cleanupFilePathAfterOrder,
} from "../steps/files";
import { cleanup } from "./clean";
import { ISettings } from "../types";
import { baseSettings } from "../test/mock";
import { join } from "path";
const { readdir, readFile } = require("fs").promises;

const mockOutput = "temp/website";

const basePage: any = (name: string) => {
	return {
		ext: ".md",
		date: "2020-05-28T09:58:59.948Z",
		meta: {},
		filename: "index.html",
		route: join(mockOutput, `${name.toLowerCase()}/index.html`),
		destpath: join(__dirname, "../../", mockOutput, name),
		data: `# ${name}\n`,
		html: `<h1 id="${name.toLowerCase()}">${name}</h1>\n`,
		title: name,
	};
};
const altSettings_partials: ISettings = {
	...baseSettings,
	output: mockOutput,
	layout: "website",
	navigation: [],
	files: [
		{
			...basePage("Work"),
			name: "readme",
			path: "/Users/silvandiepen/Repos/_projects/dokkie/pages/work/readme.md",
		},
		{
			...basePage("Item1"),
			name: "_item1",
			path: "/Users/silvandiepen/Repos/_projects/dokkie/pages/work/_item1.md",
		},
		{
			...basePage("Item2"),
			name: "_item2",
			path: "/Users/silvandiepen/Repos/_projects/dokkie/pages/work/_item2.md",
		},
	],
};

const altSettings_sections: ISettings = {
	...altSettings_partials,
	files: [
		{
			...basePage("Work"),
			name: "readme",
			path: "/Users/silvandiepen/Repos/_projects/dokkie/pages/work/readme.md",
		},
		{
			...basePage("_overview"),
			name: "readme",
			path:
				"/Users/silvandiepen/Repos/_projects/dokkie/pages/work/_overview/readme.md",
			meta: {
				layout: "thirds",
			},
			data: `---\nlayout: thirds\n---\n# Overview\n`,
		},
		{
			...basePage("Item1"),
			name: "_item1",
			path:
				"/Users/silvandiepen/Repos/_projects/dokkie/pages/work/_overview/_item1.md",
		},
		{
			...basePage("Item2"),
			name: "_item2",
			path:
				"/Users/silvandiepen/Repos/_projects/dokkie/pages/work/_overview/_item2.md",
		},
	],
};

afterEach(() => cleanup(join(__dirname, "../../", mockOutput)));

describe("Website", () => {
	it("Build a website", async () => {
		try {
			const result = await filterHiddenPages(altSettings_partials);
			expect(result.files.length).toBe(3);
		} catch (err) {
			console.log(err);
		}
	});
	it("Create Pages", async () => {
		try {
			await getLayout(altSettings_partials).then(createPages);
			const testDir = await readdir(
				join(__dirname, "../../", altSettings_partials.output)
			);
			expect(testDir.length).toBe(3);
		} catch (err) {
			console.log(err);
		}
	});
	it("Create Pages - Concat Partials", async () => {
		try {
			await concatPartials(altSettings_partials)
				.then(getLayout)
				.then(createPages);
			const testDir = await readdir(
				join(__dirname, "../../", altSettings_partials.output)
			);
			expect(testDir.length).toBe(1);
		} catch (err) {
			console.log(err);
		}
	});
	// Check if the sections are also take up into the page.
	it("Create Pages - Has meta tag", async () => {
		try {
			await getLayout(altSettings_partials).then(createPages);
			const testDir = await readdir(
				join(__dirname, "../../", altSettings_sections.output)
			);
			const testFile = await readFile(
				join(
					__dirname,
					"../../",
					altSettings_sections.output,
					testDir[0],
					"index.html"
				)
			).then((r: any): string => r.toString());
			expect(
				testFile.includes('<meta name="dokkie" content="website" />')
			).toBeTruthy();
		} catch (err) {
			console.log(err);
		}
	});

	// Check if the sections are also take up into the page.
	it("Create Pages - Concat Sections", async () => {
		try {
			const result = await concatPartials(altSettings_sections)
				.then(sectionPartials)
				.then(getLayout);

			await createPages(result);

			const testDir = await readdir(
				join(__dirname, "../../", altSettings_sections.output)
			);
			expect(testDir.length).toBe(1);
		} catch (err) {
			console.log(err);
		}
	});
	it("Create Pages - Concat Sections file", async () => {
		try {
			const result = await concatPartials(altSettings_sections)
				.then(sectionPartials)
				.then(getLayout)
				.then(convertDataToHtml);
			await createPages(result);

			expect(result.files[0].sections[0].articles.length).toBe(2);

			const testFile = await readFile(
				join(
					__dirname,
					"../../",
					altSettings_sections.output,
					"work/index.html"
				)
			).then((r: any): string => r.toString());

			document.body.innerHTML = testFile;
			const sectionContainer = document.body.querySelector(
				"main .section__container"
			);
			console.log(sectionContainer.querySelectorAll(`h1#item1`)[0]);
			expect(sectionContainer.querySelectorAll(`h1#item1`).length).toBe(1);
			expect(sectionContainer.querySelectorAll(`h1#item2`).length).toBe(1);
		} catch (err) {
			console.log(err);
		}
	});
});
