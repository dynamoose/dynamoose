import DynamoDBUtil = require("@aws-sdk/util-dynamodb");
declare type ConverterType = {
    marshall: typeof DynamoDBUtil.marshall;
    unmarshall: typeof DynamoDBUtil.unmarshall;
    convertToAttr: typeof DynamoDBUtil.convertToAttr;
    convertToNative: typeof DynamoDBUtil.convertToNative;
};
declare function main(): ConverterType;
declare namespace main {
    var set: (converter: ConverterType) => void;
    var revert: () => void;
}
export = main;
