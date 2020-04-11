import AWS from "./sdk";

let customConverter: AWS.DynamoDB.Converter | undefined;
function main(): AWS.DynamoDB.Converter {
	return customConverter || AWS.DynamoDB.Converter;
}
main.set = (converter: AWS.DynamoDB.Converter): void => {customConverter = converter;};
main.revert = (): void => {customConverter = undefined;};

export = main;
