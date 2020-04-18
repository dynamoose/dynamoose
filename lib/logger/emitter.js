const status = require("./status");
const providers = require("./providers");
const Error = require("../Error");
const utils = require("../utils");
const uuid = require("uuid").v4;

const validLevels = ["fatal", "error", "warn", "info", "debug", "trace"];

module.exports = (event) => {
	if (status.status() === "active") {
		if (!event.message || !validLevels.includes(event.level)) {
			throw new Error.InvalidParameter("You must pass in a valid message, level, and category into your event object.");
		}

		if (typeof event.category === "undefined" || event.category === null) {
			event.category = "";
		}

		const ts = new Date();
		providers.list().forEach((provider) => {
			const emitProvider = provider.provider || provider;
			if (provider.filter) {
				if (provider.filter.level) {
					if (Array.isArray(provider.filter.level)) {
						if (!provider.filter.level.includes(event.level)) {
							return;
						}
					} else {
						if (provider.filter.level.endsWith("+") || provider.filter.level.endsWith("-")) {
							const baseLevel = provider.filter.level.substring(0, provider.filter.level.length - 1);
							const index = validLevels.findIndex((level) => level === baseLevel);
							const newArray = validLevels.filter((a, i) => provider.filter.level.endsWith("+") ? i <= index : i >= index);
							if (!newArray.includes(event.level)) {
								return;
							}
						} else if (provider.filter.level !== event.level) {
							return;
						}
					}
				}
				if (provider.filter.category) {
					if (!utils.dynamoose.wildcard_allowed_check(Array.isArray(provider.filter.category) ? provider.filter.category : [provider.filter.category], event.category, {"splitString": ":", "prefixesDisallowed": false})) {
						return;
					}
				}
			}
			emitProvider.log({
				"id": uuid(),
				"timestamp": ts,
				"metadata": {},
				...event
			});
		});
	}
};
