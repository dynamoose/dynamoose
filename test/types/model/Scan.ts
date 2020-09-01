/* eslint @typescript-eslint/no-unused-vars: 0 */

import {UserTypedModel, User, UserModel} from "../Model";
import {Condition} from "../../../dist";
import {AnyDocument} from "../../../dist/Document";

// scan.exec([callback])
async function scanExec (): Promise<User[]> {
	return await UserTypedModel.scan().exec();
}
async function scanExecUnTyped (): Promise<AnyDocument[]> {
	return await UserModel.scan().exec();
}

UserTypedModel.scan().exec();

// scan.limit(count)
UserTypedModel.scan().limit(5);

// scan.startAt(key)
async function scanStartAt (): Promise<void> {
	const response = await UserTypedModel.scan().exec();
	const moreDocuments = UserTypedModel.scan().startAt(response.lastKey);
}

// scan.attributes(attributes)
UserTypedModel.scan().attributes(["id", "name"]);

// scan.parallel(parallelScans)
UserTypedModel.scan().parallel(4);

// scan.count()
async function scanCount (): Promise<void> {
	const response = await UserTypedModel.scan().count().exec();
	console.log(response);
}

// scan.consistent()
UserTypedModel.scan().consistent();

// scan.using(index)
UserTypedModel.scan().using("name-index");

// scan.all([delay[, max]])
UserTypedModel.scan().all();
UserTypedModel.scan().all(100);
UserTypedModel.scan().all(0, 5);

// scan.and()
UserTypedModel.scan("id").eq(1).and().where("name").eq("Bob");
UserTypedModel.scan("id").eq(1).where("name").eq("Bob");

// scan.or()
UserTypedModel.scan("id").eq(1).or().where("name").eq("Bob");

// scan.not()
UserTypedModel.scan("id").not().eq(1);
UserTypedModel.scan("id").not().between(1, 2);

// scan.parenthesis(condition)
UserTypedModel.scan("id").eq(1).and().parenthesis(new Condition().where("name").eq("Bob"));
UserTypedModel.scan("id").eq(1).and().parenthesis((condition) => condition.where("name").eq("Bob"));

// scan.group(condition)
UserTypedModel.scan("id").eq(1).and().group(new Condition().where("name").eq("Bob"));
UserTypedModel.scan("id").eq(1).and().group((condition) => condition.where("name").eq("Bob"));

// scan.filter(key)
UserTypedModel.scan().filter("id");
UserTypedModel.scan().filter("id").eq(1);

// scan.where(key)
UserTypedModel.scan().where("id");
UserTypedModel.scan().where("id").eq(1);

// scan.attribute(key)
UserTypedModel.scan().attribute("id");
UserTypedModel.scan().attribute("id").eq(1);

// scan.eq(value)
UserTypedModel.scan().filter("name").eq("Tom");

// scan.exists()
UserTypedModel.scan().filter("phoneNumber").exists();
UserTypedModel.scan().filter("phoneNumber").not().exists();

// scan.lt(value)
UserTypedModel.scan().filter("age").lt(5);

// scan.le(value)
UserTypedModel.scan().filter("age").le(5);

// scan.gt(value)
UserTypedModel.scan().filter("age").gt(5);

// scan.ge(value)
UserTypedModel.scan().filter("age").ge(5);

// scan.beginsWith(value)
UserTypedModel.scan().filter("name").beginsWith("T");

// scan.contains(value)
UserTypedModel.scan().filter("name").contains("om");

// scan.in(values)
UserTypedModel.scan("name").in(["Charlie", "Bob"]);

// scan.between(a, b)
UserTypedModel.scan().filter("age").between(5, 9);
