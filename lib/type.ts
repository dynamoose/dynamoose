import Internal = require("./Internal");

export = {
	"UNDEFINED": Internal.Public.undefined,
	"THIS": Internal.Public.this,
	"NULL": Internal.Public.null,
	"ANY": Internal.Public.any,
	"CONSTANT": (value: string | number | boolean) => ({
		"value": "Constant",
		"settings": {
			value
		}
	}),
	"COMBINE": (attributes: string[], separator?: string | undefined) => {
		const settings: {attributes: string[], separator?: string | undefined} = {attributes};

		if (separator) {
			settings.separator = separator;
		}

		return {
			"value": "Combine",
			settings
		};
	}
};
