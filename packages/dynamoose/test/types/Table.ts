import * as dynamoose from "../../dist";
import {Item} from "../../dist/Item";

class TableUser extends Item {
	id!: number;
	name!: string;
}
class TableCredit extends Item {
	id!: number;
	amount!: number;
}
const TableUserModel = dynamoose.model<TableUser>("TableUser", {"id": Number, "name": String});
const TableCreditModel = dynamoose.model<TableCredit>("TableCredit", {"id": Number, "amount": Number});

const shouldSucceedWithModel = new dynamoose.Table("Table", [TableUserModel]);
const shouldSucceedWithModelsOfDifferentItemTypes = new dynamoose.Table("Table", [TableUserModel, TableCreditModel]);
const otherInstance = new dynamoose.Instance();
const shouldSucceedWithModelOnInstanceTable = new otherInstance.Table("Table", [TableUserModel]);
// @ts-expect-error
const shouldFailWithInternalModelClass = new dynamoose.Table("Table", [TableUserModel.Model]);
// @ts-expect-error
const shouldFailWithObjectThatIsNotAModel = new dynamoose.Table("Table", [{"name": "User"}]);

const shouldSucceedWithWaitForActiveAsObject = new dynamoose.Table("Table", [], {"waitForActive": {"enabled": true}});
const shouldSucceedWithWaitForActiveSetToFalse = new dynamoose.Table("Table", [], {"waitForActive": false});
const shouldSucceedWithWaitForActiveSetToTrue = new dynamoose.Table("Table", [], {"waitForActive": true});

const shouldSucceedWithTagsSetToObject = new dynamoose.Table("Table", [], {"tags": {"foo": "bar"}});
const shouldSucceedWithTagsSetToEmptyObject = new dynamoose.Table("Table", [], {"tags": {}});

const shouldAllowForAccessingHashKey = new dynamoose.Table("Table", []).hashKey;
const shouldAllowForAccessingRangeKey = new dynamoose.Table("Table", []).rangeKey;

const shouldAllowForAccessingTableDefaults = dynamoose.Table.defaults;
const shouldAllowForGettingTableDefaults = dynamoose.Table.defaults.get();
const shouldAllowForSettingTableDefaults = dynamoose.Table.defaults.set({
	"prefix": "MyApp_"
});
