const globals = require("globals");
const tsParser = require("@typescript-eslint/parser");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const js = require("@eslint/js");

module.exports = [
	// Global ignores
	{
		"ignores": [
			"docs/.docusaurus",
			"docs/build",
			"docs/node_modules",
			"docs/src/pages",
			"**/dist",
			"publish/node_modules",
			"**/.*.js"
		]
	},

	// Base configuration for all files
	js.configs.recommended,

	// JavaScript files
	{
		"languageOptions": {
			"globals": {
				...globals.commonjs,
				...globals.node,
				"Atomics": "readonly",
				"SharedArrayBuffer": "readonly"
			},
			"ecmaVersion": 2022,
			"sourceType": "commonjs"
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
			"eol-last": "error",
			"no-console": "error"
		}
	},

	// TypeScript files
	{
		"files": ["**/*.ts"],
		"languageOptions": {
			"parser": tsParser,
			"parserOptions": {
				"ecmaVersion": 2022,
				"sourceType": "module"
			}
		},
		"plugins": {
			"@typescript-eslint": typescriptEslint
		},
		"rules": {
			"@typescript-eslint/no-this-alias": "off",
			"@typescript-eslint/no-var-requires": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"brace-style": "off",
			"comma-spacing": "off",
			"keyword-spacing": "off",
			"no-extra-parens": "off",
			"semi": "off",
			"space-before-function-paren": "off",
			"@typescript-eslint/ban-types": "off",
			"@typescript-eslint/explicit-module-boundary-types": "off"
		}
	},

	// Test files (Jest globals)
	{
		"files": ["**/test/**/*.js", "**/*.test.js", "**/*.spec.js"],
		"languageOptions": {
			"globals": {
				...globals.jest,
				"describe": "readonly",
				"it": "readonly",
				"test": "readonly",
				"expect": "readonly",
				"beforeEach": "readonly",
				"afterEach": "readonly",
				"beforeAll": "readonly",
				"afterAll": "readonly",
				"jest": "readonly"
			}
		},
		"rules": {
			"no-console": "off",
			"no-unused-vars": "off"
		}
	},
	
	// Benchmark files
	{
		"files": ["**/benchmarks/**/*.js"],
		"rules": {
			"no-console": "off",
			"quote-props": "off",
			"no-trailing-spaces": "off",
			"eol-last": "off",
			"object-curly-spacing": "off",
			"arrow-parens": "off",
			"comma-dangle": "off",
			"no-extra-parens": "off",
			"no-unused-vars": "off"
		}
	},
	
	// Utility scripts and logger (console allowed)
	{
		"files": ["**/publish/**/*.js", "**/utils/**/*.js", "**/packages/dynamoose-logger/**/*.ts"],
		"rules": {
			"no-console": "off",
			"no-unused-vars": "off"
		}
	}
];
