import utils from "../utils";
import internalProviders from "./internal_providers";
let providers = [];

// This method takes the provider and converts it to an internal provider if exists (ex. `console`)
const normalizeProvider = (provider): any => {
	if (provider === console) {
		return new internalProviders.console();
	} else {
		return provider;
	}
};

export = {
	"set": (provider): void => {
		if (typeof provider === "undefined" || provider === null) {
			provider = [];
		}

		providers = (Array.isArray(provider) ? provider : [provider]).map(normalizeProvider);
	},
	"clear": (): void => {
		providers = [];
	},
	"add": (provider): void => {
		const newProviders = (Array.isArray(provider) ? provider : [provider]).map(normalizeProvider);
		providers.push(...newProviders);
	},
	"delete": (id: string | string[]): void => {
		const deleteFunction = (id: string) => {
			const index = providers.findIndex((provider) => provider.id === id);
			utils.object.delete(providers, index);
		};
		if (Array.isArray(id)) {
			id.forEach((id) => deleteFunction(id));
		} else {
			deleteFunction(id);
		}
	},
	"list": (): any[] => providers
};
