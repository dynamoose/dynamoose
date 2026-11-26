import * as DynamoDBUtil from "@aws-sdk/util-dynamodb";

type ConverterType = {
	marshall: typeof DynamoDBUtil.marshall;
	unmarshall: typeof DynamoDBUtil.unmarshall;
	convertToAttr: typeof DynamoDBUtil.convertToAttr;
	convertToNative: typeof DynamoDBUtil.convertToNative;
};

// Gives the same result as DynamoDBUtil.convertToAttr for strings, safe numbers, booleans and null, without the SDK's chain of type checks.
// Other values (including NaN, Infinity, unsafe integers and undefined, which the SDK rejects) and calls with options go to the SDK.
const convertToAttr = (value: Parameters<typeof DynamoDBUtil.convertToAttr>[0], options?: Parameters<typeof DynamoDBUtil.convertToAttr>[1]): ReturnType<typeof DynamoDBUtil.convertToAttr> => {
	if (options === undefined) {
		const type = typeof value;
		if (type === "string") {
			return {"S": value};
		}
		if (type === "number" && Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER && value >= Number.MIN_SAFE_INTEGER) {
			return {"N": value.toString()};
		}
		if (type === "boolean") {
			return {"BOOL": value};
		}
		if (value === null) {
			return {"NULL": true};
		}
	}
	return DynamoDBUtil.convertToAttr(value, options);
};

let customConverter: ConverterType | undefined;
const defaultConverter: ConverterType = {
	"marshall": DynamoDBUtil.marshall,
	"unmarshall": DynamoDBUtil.unmarshall,
	"convertToAttr": convertToAttr,
	"convertToNative": DynamoDBUtil.convertToNative
};
function main (): ConverterType {
	return customConverter || defaultConverter;
}
main.set = (converter: ConverterType): void => {
	customConverter = converter;
};
main.revert = (): void => {
	customConverter = undefined;
};

export default main;
