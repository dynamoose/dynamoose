import {AnySimpleObject, AnySimpleValue} from "../Types";

export default <T = AnySimpleObject | AnySimpleValue>(array: T[], key: string): AnySimpleObject => {
	if (!array) {
		return {};
	}

	return array.reduce((result, item) => ({
		...result,
		[key ? item[key] : item]: item
	}), {});
};
