module.exports = {
	"sidebar": [
		{
			"type": "category",
			"label": "Getting Started",
			"items": [
				"getting_started/Introduction",
				"getting_started/Install",
				"getting_started/Import",
				"getting_started/Configure",
				{
					"type": "category",
					"label": "Features",
					"items": [
						"getting_started/TypeScript",
						"getting_started/JSDoc"
					]
				}
			]
		},
		{
			"type": "category",
			"label": "Guide",
			"items": [
				"guide/Schema",
				"guide/Model",
				"guide/Table",
				"guide/Item",
				"guide/Condition",
				"guide/Query",
				"guide/Scan",
				"guide/Transaction",
				"guide/Dynamoose",
				"guide/Logging"
			]
		},
		{
			"type": "category",
			"label": "Other",
			"items": [
				"other/FAQ",
				"other/Maintained Versions",
				"other/Version Requirements"
			]
		},
		{
			"type": "category",
			"label": "Sponsored By",
			"collapsed": false,
			"items": [
				{
					"type": "link",
					"label": "Dynobase",
					"href": "https://dynobase.dev/?ref=dynamoose"
				}
			]
		}
	]
};
