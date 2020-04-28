import AWS from "./sdk";

let customConverter: typeof AWS.DynamoDB.Converter | undefined;
function main(): typeof AWS.DynamoDB.Converter {
	return customConverter || AWS.DynamoDB.Converter;
}
main.set = (converter: typeof AWS.DynamoDB.Converter): void => {customConverter = converter;};
main.revert = (): void => {customConverter = undefined;};

export = main;
