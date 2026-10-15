import * as dynamoose from "../../dist";

const shouldSucceedWithWaitForActiveAsObject = new dynamoose.Table("Table", [], {"waitForActive": {"enabled": true}});
const shouldSucceedWithWaitForActiveSetToFalse = new dynamoose.Table("Table", [], {"waitForActive": false});
const shouldSucceedWithWaitForActiveSetToTrue = new dynamoose.Table("Table", [], {"waitForActive": true});

const shouldSucceedWithTagsSetToObject = new dynamoose.Table("Table", [], {"tags": {"foo": "bar"}});
const shouldSucceedWithTagsSetToEmptyObject = new dynamoose.Table("Table", [], {"tags": {}});

const shouldSucceedWithReadStrictSetToFalse = new dynamoose.Table("Table", [], {"readStrict": false});

const shouldAllowForAccessingHashKey = new dynamoose.Table("Table", []).hashKey;
const shouldAllowForAccessingRangeKey = new dynamoose.Table("Table", []).rangeKey;

const shouldAllowForAccessingTableDefaults = dynamoose.Table.defaults;
const shouldAllowForGettingTableDefaults = dynamoose.Table.defaults.get();
const shouldAllowForSettingTableDefaults = dynamoose.Table.defaults.set({
	"prefix": "MyApp_"
});
