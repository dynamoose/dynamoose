let undefinedPackages = [];

export default async (name: string): Promise<any> => {
	if (undefinedPackages.includes(name)) {
		throw new Error("Package can not be found.");
	} else {
		return await import(name);
	}
};

export const setUndefinedPackage = (name: string, result: any): void => {
	undefinedPackages.push(name);
};
export const revertPackages = (): void => {
	undefinedPackages = [];
};
