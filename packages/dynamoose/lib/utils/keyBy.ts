import {AnySimpleObject, AnySimpleValue} from "../Types";

// Source: https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore
export default <T = AnySimpleObject | AnySimpleValue>(array: T[], key: string) =>
	(array || []).reduce((r, x) => ({...r, [key ? x[key] : x]: x}), {});
