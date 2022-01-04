module.exports = {
	"title": "Dynamoose",
	"tagline": "Dynamoose is a modeling tool for Amazon's DynamoDB",
	"url": "https://dynamoosejs.com",
	"baseUrl": "/",
	"favicon": "img/favicon.ico",
	"themeConfig": {
		"navbar": {
			"title": "Dynamoose",
			"logo": {
				"alt": "Logo",
				"src": "img/logo.svg"
			},
			"items": [
				{
					"href": "https://www.npmjs.com/package/dynamoose",
					"className": "header-link header-npm-link",
					"aria-label": "NPM",
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
			"apiKey": "ad8f45e217e480b02545037bf3c58887",
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
					"editUrl": "https://github.com/dynamoose/dynamoose/edit/main/docs",
					"remarkPlugins": [
						require("./src/plugins/remark-npm2yarn")
					]
				},
				"theme": {
					"customCss": require.resolve("./src/css/custom.css")
				}
			}
		]
	]
};
