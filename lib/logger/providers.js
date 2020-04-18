const utils = require("../utils");
let providers = [];

module.exports = {
	"set": (provider) => {
		if (typeof provider === "undefined" || provider === null) {
			provider = [];
		}

		providers = Array.isArray(provider) ? provider : [provider];
	},
	"clear": () => {
		providers = [];
	},
	"add": (provider) => {
		const newProviders = Array.isArray(provider) ? provider : [provider];
		providers.push(...newProviders);
	},
	"delete": (id) => {
		const deleteFunction = (id) => {
			const index = providers.findIndex((provider) => provider.id === id);
			utils.object.delete(providers, index);
		};
		if (Array.isArray(id)) {
			id.forEach((id) => deleteFunction(id));
		} else {
			deleteFunction(id);
		}
	},
	"list": () => providers
};
