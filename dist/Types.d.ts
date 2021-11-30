import DynamoDB = require("@aws-sdk/client-dynamodb");
export declare type AttributeMap = {
    [key: string]: DynamoDB.AttributeValue;
};
export declare type ExpressionAttributeNameMap = {
    [key: string]: string;
};
export declare type ExpressionAttributeValueMap = {
    [key: string]: DynamoDB.AttributeValue;
};
declare global {
    interface Blob {
    }
    interface File {
    }
}
