import * as DynamoDBUtil from "@aws-sdk/util-dynamodb";

type ConverterType = {
	marshall: typeof DynamoDBUtil.marshall;
	unmarshall: typeof DynamoDBUtil.unmarshall;
	convertToAttr: typeof DynamoDBUtil.convertToAttr;
	convertToNative: typeof DynamoDBUtil.convertToNative;
};

let customConverter: ConverterType | undefined;
const defaultConverter: ConverterType = {
	"marshall": DynamoDBUtil.marshall,
	"unmarshall": DynamoDBUtil.unmarshall,
	"convertToAttr": DynamoDBUtil.convertToAttr,
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
