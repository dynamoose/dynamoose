module.exports = {
	"plugins": [
		"no-only-tests"
	],
	"env": {
		"jest": true
	},
	"rules": {
		"no-only-tests/no-only-tests": "error",
		// The benchmark prints its results.
		"no-console": "off"
	}
};
