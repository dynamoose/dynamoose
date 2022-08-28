/* eslint @typescript-eslint/no-unused-vars: 0, no-console: 0 */

import {UserTypedModel, User, UserModel} from "../Model";
import {Condition} from "../../../dist";
import {AnyItem} from "../../../dist/Item";
import {ScanResponse, Scan} from "../../../dist/ItemRetriever";

// scan.exec([callback])
async function scanExec (): Promise<User[]> {
	return await UserTypedModel.scan().exec();
}
async function scanExecUnTyped (): Promise<AnyItem[]> {
	return await UserModel.scan().exec();
}

const scanExecUnTypedWithScanResponse: Promise<ScanResponse<AnyItem>> = UserModel.scan().exec();
const scanExecTyped: Promise<ScanResponse<User>> = UserTypedModel.scan("name").eq("Will").exec();

UserTypedModel.scan().exec();

let isAssignableToScan : Scan<User>;

// scan.limit(count)
isAssignableToScan = UserTypedModel.scan().limit(5);

// scan.startAt(key)
async function scanStartAt (): Promise<Scan<User>> {
	const response = await UserTypedModel.scan().exec();
	return UserTypedModel.scan().startAt(response.lastKey);
}

// scan.attributes(attributes)
isAssignableToScan = UserTypedModel.scan().attributes(["id", "name"]);

// scan.parallel(parallelScans)
isAssignableToScan = UserTypedModel.scan().parallel(4);

// scan.count()
async function scanCount (): Promise<void> {
	const response = await UserTypedModel.scan().count().exec();
	console.log(response);
}

// scan.consistent()
isAssignableToScan = UserTypedModel.scan().consistent();

// scan.using(index)
isAssignableToScan = UserTypedModel.scan().using("name-index");

// scan.all([delay[, max]])
isAssignableToScan = UserTypedModel.scan().all();
isAssignableToScan = UserTypedModel.scan().all(100);
isAssignableToScan = UserTypedModel.scan().all(0, 5);

// scan.and()
isAssignableToScan = UserTypedModel.scan("id").eq(1).and().where("name").eq("Bob");
isAssignableToScan = UserTypedModel.scan("id").eq(1).where("name").eq("Bob");

// scan.or()
isAssignableToScan = UserTypedModel.scan("id").eq(1).or().where("name").eq("Bob");

// scan.not()
isAssignableToScan = UserTypedModel.scan("id").not().eq(1);
isAssignableToScan = UserTypedModel.scan("id").not().between(1, 2);

// scan.parenthesis(condition)
isAssignableToScan = UserTypedModel.scan("id").eq(1).and().parenthesis(new Condition().where("name").eq("Bob"));
isAssignableToScan = UserTypedModel.scan("id").eq(1).and().parenthesis((condition) => condition.where("name").eq("Bob"));

// scan.group(condition)
isAssignableToScan = UserTypedModel.scan("id").eq(1).and().group(new Condition().where("name").eq("Bob"));
isAssignableToScan = UserTypedModel.scan("id").eq(1).and().group((condition) => condition.where("name").eq("Bob"));

// scan.filter(key)
isAssignableToScan = UserTypedModel.scan().filter("id");
isAssignableToScan = UserTypedModel.scan().filter("id").eq(1);

// scan.where(key)
isAssignableToScan = UserTypedModel.scan().where("id");
isAssignableToScan = UserTypedModel.scan().where("id").eq(1);

// scan.attribute(key)
isAssignableToScan = UserTypedModel.scan().attribute("id");
isAssignableToScan = UserTypedModel.scan().attribute("id").eq(1);

// scan.eq(value)
isAssignableToScan = UserTypedModel.scan().filter("name").eq("Tom");

// scan.exists()
isAssignableToScan = UserTypedModel.scan().filter("phoneNumber").exists();
isAssignableToScan = UserTypedModel.scan().filter("phoneNumber").not().exists();

// scan.lt(value)
isAssignableToScan = UserTypedModel.scan().filter("age").lt(5);

// scan.le(value)
isAssignableToScan = UserTypedModel.scan().filter("age").le(5);

// scan.gt(value)
isAssignableToScan = UserTypedModel.scan().filter("age").gt(5);

// scan.ge(value)
isAssignableToScan = UserTypedModel.scan().filter("age").ge(5);

// scan.beginsWith(value)
isAssignableToScan = UserTypedModel.scan().filter("name").beginsWith("T");

// scan.contains(value)
isAssignableToScan = UserTypedModel.scan().filter("name").contains("om");

// scan.in(values)
isAssignableToScan = UserTypedModel.scan("name").in(["Charlie", "Bob"]);

// scan.between(a, b)
isAssignableToScan = UserTypedModel.scan().filter("age").between(5, 9);
