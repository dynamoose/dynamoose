module.exports = {
	"env": {
		"commonjs": true,
		"es6": true,
		"node": true
	},
	"extends": "eslint:recommended",
	"overrides": [
		{
			"files": ["**/*.ts"],
			"parser": "@typescript-eslint/parser",
			"extends": [
				"eslint:recommended",
				"plugin:@typescript-eslint/eslint-recommended",
				"plugin:@typescript-eslint/recommended"
			],
			"plugins": ["@typescript-eslint"],
			"rules": {
				"@typescript-eslint/camelcase": "off",
				"@typescript-eslint/no-this-alias": "off",
				"@typescript-eslint/no-var-requires": "off",
				"@typescript-eslint/no-explicit-any": "off"
			}
		}
	],
	"globals": {
		"Atomics": "readonly",
		"SharedArrayBuffer": "readonly"
	},
	"parserOptions": {
		"ecmaVersion": 2018
	},
	"rules": {
		"indent": [
			"error",
			"tab"
		],
		"linebreak-style": [
			"error",
			"unix"
		],
		"quotes": [
			"error",
			"double"
		],
		"semi": [
			"error",
			"always"
		]
	}
};
