const fs = require("fs");
const path = require("path");

(async () => {
	const translationLanguages = require("./docusaurus.config.js").i18n.locales;
	const defaultLanguage = require("./docusaurus.config.js").i18n.defaultLocale;
	const nonDefaultLanguages = translationLanguages.filter((language) => language !== defaultLanguage);

	const defaultLanguagePath = path.join(__dirname, "docs");

	for (const language of nonDefaultLanguages) {
		const translationPath = path.join(__dirname, "i18n", language);

		// Fix `hide_title` in `getting_started/Introduction.mdx`
		// We want to take the real value of `hide_title` from the English version
		const introductionFile = path.join(translationPath, "docusaurus-plugin-content-docs", "current", "getting_started", "Introduction.mdx");
		const introductionFileDefault = path.join(defaultLanguagePath, "getting_started", "Introduction.mdx");
		// Find the line that starts with `hide_title: ` in the English version and replace it in the translation
		const introduction = fs.readFileSync(introductionFile, "utf8");
		const introductionDefault = fs.readFileSync(introductionFileDefault, "utf8");
		const hideTitleLine = introductionDefault.match(/hide_title: .*/);
		const introductionFixed = introduction.replace(/hide_title: .*/, hideTitleLine[0]);
		fs.writeFileSync(introductionFile, introductionFixed);


		// Fix adding ` around the "{read: number, write: number}" string in `guide/Schema.md`
		// We want to add ` around the "{read: number, write: number}" string in the translation
		const schemaFile = path.join(translationPath, "docusaurus-plugin-content-docs", "current", "guide", "Schema.md");
		const schema = fs.readFileSync(schemaFile, "utf8");
		const schemaFixed = schema.replace(/{read: number, write: number}/, "`{read: number, write: number}`");
		fs.writeFileSync(schemaFile, schemaFixed);

		// Fix Import.mdx
		const importFile = path.join(translationPath, "docusaurus-plugin-content-docs", "current", "getting_started", "Import.mdx");
		const importContent = fs.readFileSync(importFile, "utf8");
		let importFixed = importContent
			.replace("<Tabs defaultValue=\"commonjs\" values={[\n        {\"label\": \"CommonJS\", value: \"commonjs\"}, \"TypeScript\", \"typescript\"}, \"ES Modules\", \"esmodules\"} ] } mark =crwd-mark>", "\n\n<Tabs\n	defaultValue=\"commonjs\"\n	values={[\n		{\"label\": \"CommonJS\", value: \"commonjs\"},\n		{\"label\": \"TypeScript\", value: \"typescript\"},\n		{\"label\": \"ES Modules\", value: \"esmodules\"}\n	]\n}>");
		importFixed = `${["import Tabs from \"@theme/Tabs\";", "import TabItem from \"@theme/TabItem\";"].join("\n")}\n\n${importFixed}`;
		fs.writeFileSync(importFile, importFixed);

		// eslint-disable-next-line no-console
		console.log(`Fixed Crowdin for ${language}`);
	}
})();

// eslint-disable-next-line no-console
console.log("Finished fixing Crowdin");
