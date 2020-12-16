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
				"@typescript-eslint/no-explicit-any": "off",
				"brace-style": "off",
				"@typescript-eslint/brace-style": "error",
				"comma-spacing": "off",
				"@typescript-eslint/comma-spacing": "error",
				"keyword-spacing": "off",
				"@typescript-eslint/keyword-spacing": "error",
				"no-extra-parens": "off",
				"@typescript-eslint/no-extra-parens": "error",
				"semi": "off",
				"@typescript-eslint/semi": "error",
				"space-before-function-paren": "off",
				"@typescript-eslint/space-before-function-paren": "error",
				"@typescript-eslint/ban-types": "off",
				"@typescript-eslint/explicit-module-boundary-types": "off"
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
		"indent": ["error", "tab"],
		"linebreak-style": ["error", "unix"],
		"semi": ["error", "always"],
		"quotes": ["error", "double"],
		"quote-props": ["error", "always"],
		"space-in-parens": "error",
		"no-multi-spaces": "error",
		"space-before-blocks": "error",
		"arrow-spacing": "error",
		"keyword-spacing": "error",
		"space-before-function-paren": "error",
		"object-curly-spacing": "error",
		"brace-style": "error",
		"comma-spacing": "error",
		"no-extra-parens": "error",
		"arrow-parens": "error",
		"comma-dangle": "error",
		"multiline-ternary": ["error", "never"],
		"no-trailing-spaces": "error",
		"array-element-newline": ["error", "consistent"],
		"array-bracket-spacing": "error",
		"array-bracket-newline": ["error", "consistent"],
		"eol-last": "error"
	}
};
