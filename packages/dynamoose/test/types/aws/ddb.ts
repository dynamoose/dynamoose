import * as dynamoose from "../../../dist";

const shouldPassWithParam = dynamoose.aws.ddb.local("http://localhost:8000");

const shouldPassWithoutParams = dynamoose.aws.ddb.local();
