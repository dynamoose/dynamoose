let undefinedPackages = [];

export default async (name: string): Promise<any> => {
	if (undefinedPackages.includes(name)) {
		throw new Error("Package can not be found.");
	} else {
		const pkg = await import(name);
		return pkg;
	}
};

export const setUndefinedPackage = (name: string): void => {
	undefinedPackages.push(name);
};
export const revertPackages = (): void => {
	undefinedPackages = [];
};
