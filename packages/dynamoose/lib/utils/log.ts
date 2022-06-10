import importPackage from "./importPackage";

export default async (...args: any[]) => {
	let log;
	try {
		log = await importPackage("dynamoose-logger/dist/emitter");
	} catch (e) {} // eslint-disable-line no-empty

	if (log && typeof log === "function") {
		log(...args);
	}
};
