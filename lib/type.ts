import Internal = require("./Internal");

export default {
	/**
	 * Setting an attribute value to this will cause it to bypass the `default` value, and set it to `undefined` in the database.
	 *
	 * ```js
	 * const dynamoose = require("dynamoose");
	 *
	 * const User = dynamoose.model("User", {"id": String, "name": {"type": String, "default": "Bob"}});
	 * const user = new User({"id": 1, "name": dynamoose.type.UNDEFINED});
	 * await user.save();
	 * // {"id": 1}
	 * // will be saved to the database (notice the `name` property is undefined and did not use the `default` property)
	 * ```
	 */
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
