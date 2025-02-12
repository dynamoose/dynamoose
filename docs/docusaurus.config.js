module.exports = {
	"title": "Dynamoose",
	"tagline": "Dynamoose is a modeling tool for Amazon's DynamoDB",
	"url": "https://dynamoosejs.com",
	"baseUrl": "/",
	"trailingSlash": undefined,
	"favicon": "img/favicon.ico",
	"headTags": [
		{
			"tagName": "a",
			"attributes": {
				"rel": "me",
				"href": "https://mastodon.social/@dynamoose"
			}
		}
	],
	"themeConfig": {
		"navbar": {
			"title": "Dynamoose",
			"logo": {
				"alt": "Logo",
				"src": "img/logo.svg"
			},
			"items": [
				{
					"type": "dropdown",
					"label": "Version",
					"position": "right",
					"items": [
						{
							"label": "Latest",
							"href": "https://dynamoosejs.com"
						},
						{
							"label": "v3.x.x",
							"href": "https://v3.dynamoosejs.com"
						},
						{
							"label": "v2.x.x",
							"href": "https://v2.dynamoosejs.com"
						},
						{
							"label": "v1.x.x",
							"href": "https://v1.dynamoosejs.com"
						}
					]
				},
				{
					"type": "localeDropdown",
					"position": "right",
					"dropdownItemsAfter": [
						{
							"type": "html",
							"value": "<hr style=\"margin: 0.3rem 0;\">"
						},
						{
							"href": "https://crowdin.com/project/dynamoosejscom",
							"label": "Help Us Translate"
						}
					]
				},
				{
					"href": "https://www.npmjs.com/package/dynamoose",
					"className": "header-link header-npm-link",
					"aria-label": "npm",
					"position": "right"
				},
				{
					"href": "https://github.com/dynamoose/dynamoose",
					"className": "header-link header-github-link",
					"aria-label": "GitHub",
					"position": "right"
				}
			]
		},
		"footer": {
			"style": "dark",
			"links": [
				{
					"title": "Social",
					"items": [
						{
							"label": "GitHub",
							"href": "https://github.com/dynamoose/dynamoose"
						},
						{
							"label": "Slack",
							"href": "https://join.slack.com/t/dynamoose/shared_invite/enQtODM4OTI0MTc1NDc3LWI3MmNhMThmNmJmZDk5MmUxOTZmMGEwNGQzNTRkMjhjZGJlNGM5M2JmZjMzMzlkODRhMGY3MTQ5YjQ2Nzg3YTY"
						},
						{
							"label": "Mastodon",
							"href": "https://mastodon.social/@dynamoose"
						},
						{
							"label": "Twitter",
							"href": "https://twitter.com/dynamoosejs"
						},
						{
							"label": "Stack Overflow",
							"href": "https://stackoverflow.com/questions/tagged/dynamoose"
						},
						{
							"label": "YouTube",
							"href": "https://www.youtube.com/channel/UCw4K_PDdzsZPM1PSeqS997Q"
						}
					]
				},
				{
					"title": "Other Resources",
					"items": [
						{
							"label": "Sponsor Dynamoose",
							"href": "https://github.com/dynamoose/dynamoose/blob/main/SPONSOR.md"
						},
						{
							"label": "Translate Dynamoose",
							"href": "https://crowdin.com/project/dynamoosejscom"
						},
						{
							"label": "Contributing Guidelines",
							"href": "https://github.com/dynamoose/dynamoose/blob/main/CONTRIBUTING.md"
						},
						{
							"label": "Code of Conduct",
							"href": "https://github.com/dynamoose/dynamoose/blob/main/CODE_OF_CONDUCT.md"
						},
						{
							"label": "Changelog",
							"href": "https://github.com/dynamoose/dynamoose/blob/main/CHANGELOG.md"
						},
						{
							"label": "License",
							"href": "https://github.com/dynamoose/dynamoose/blob/main/LICENSE"
						}
					]
				}
			]
		},
		"algolia": {
			"appId": "KJLP8QLNW4",
			"apiKey": "c64fcb476b3fa85bab910ae6eb333eca",
			"indexName": "dynamoosejs"
		},
		"colorMode": {
			"respectPrefersColorScheme": true
		}
	},
	"presets": [
		[
			"@docusaurus/preset-classic",
			{
				"docs": {
					"routeBasePath": "/",
					"sidebarPath": require.resolve("./sidebars.js"),
					"editUrl": ({docPath}) => `https://github.com/dynamoose/dynamoose/edit/main/docs/docs_src/${docPath}`,
					"remarkPlugins": [
						[require("@docusaurus/remark-plugin-npm2yarn"), {"sync": true}]
					]
				},
				"theme": {
					"customCss": require.resolve("./src/css/custom.css")
				}
			}
		]
	],
	"i18n": {
		"defaultLocale": "en",
		"locales": [
			"en",
			"es"
		]
	}
};
