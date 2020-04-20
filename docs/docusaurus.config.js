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
				"src": "img/logo.svg",
			},
			"links": [
				{
					"href": "https://github.com/dynamoosejs/dynamoose",
					"label": "GitHub",
					"position": "right",
				},
				{
					"href": "https://www.npmjs.com/package/dynamoose",
					"label": "NPM",
					"position": "right",
				},
			],
		},
		"footer": {
			"style": "dark",
			"links": [
				{
					"title": "Resources",
					"items": [
						{
							"label": "GitHub",
							"href": "https://github.com/dynamoosejs/dynamoose",
						},
						{
							"label": "Slack",
							"href": "https://join.slack.com/t/dynamoose/shared_invite/enQtODM4OTI0MTc1NDc3LWI3MmNhMThmNmJmZDk5MmUxOTZmMGEwNGQzNTRkMjhjZGJlNGM5M2JmZjMzMzlkODRhMGY3MTQ5YjQ2Nzg3YTY",
						},
						{
							"label": "Twitter",
							"href": "https://twitter.com/dynamoosejs",
						},
						{
							"label": "Stack Overflow",
							"href": "https://stackoverflow.com/questions/tagged/dynamoose",
						}
					],
				},
			],
		},
	},
	"presets": [
		[
			"@docusaurus/preset-classic",
			{
				"docs": {
					"routeBasePath": "",
					"sidebarPath": require.resolve("./sidebars.js"),
					"editUrl": "https://github.com/dynamoosejs/dynamoose/edit/master/docs",
					"remarkPlugins": [
						require("./src/plugins/remark-npm2yarn")
					],
				},
				"theme": {
					"customCss": require.resolve("./src/css/custom.css"),
				},
			},
		],
	],
};
