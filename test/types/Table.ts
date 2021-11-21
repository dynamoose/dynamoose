import * as dynamoose from "../../dist";

const shouldSucceedWithWaitForActiveAsObject = new dynamoose.Table("Table", [], {"waitForActive": {"enabled": true}});
const shouldSucceedWithWaitForActiveSetToFalse = new dynamoose.Table("Table", [], {"waitForActive": false});
const shouldSucceedWithWaitForActiveSetToTrue = new dynamoose.Table("Table", [], {"waitForActive": true});

const shouldAllowForAccessingHashKey = (new dynamoose.Table("Table", [])).hashKey;
const shouldAllowForAccessingRangeKey = (new dynamoose.Table("Table", [])).rangeKey;