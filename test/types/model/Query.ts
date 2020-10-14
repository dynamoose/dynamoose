/* eslint @typescript-eslint/no-unused-vars: 0 */

import {UserTypedModel, UserModel, User} from "../Model";
import {SortOrder} from "../../../dist/General";
import {Condition} from "../../../dist";
import {AnyDocument} from "../../../dist/Document";

// query.exec([callback])
async function queryExec (): Promise<User[]> {
	return await UserTypedModel.query().exec();
}
async function queryExecUnTyped (): Promise<AnyDocument[]> {
	return await UserModel.query().exec();
}

// query.limit(count)
UserTypedModel.query("name").eq("Will").limit(5);

// query.startAt(key)
async function queryStartAt (): Promise<void> {
	const response = await UserTypedModel.query("name").eq("Will").exec();
	UserTypedModel.query("name").eq("Will").startAt(response.lastKey);
}

// query.attributes(attributes)
UserTypedModel.query("name").eq("Will").attributes(["id", "name"]);

// query.count()
async function queryCount (): Promise<void> {
	const response = await UserTypedModel.query("name").eq("Will").count().exec();
	console.log(response);
}

// query.consistent()
UserTypedModel.query("name").eq("Will").consistent();

// query.using(index)
UserTypedModel.query("name").eq("Will").using("name-index");

// query.sort(order)
UserTypedModel.query("name").eq("Will").sort(SortOrder.ascending);
UserTypedModel.query("name").eq("Will").sort(SortOrder.descending);

// query.all([delay[, max]])
UserTypedModel.query("name").eq("Will").all();
UserTypedModel.query("name").eq("Will").all(100);
UserTypedModel.query("name").eq("Will").all(0, 5);

// query.and()
UserTypedModel.query("id").eq(1).and().where("name").eq("Bob");
UserTypedModel.query("id").eq(1).where("name").eq("Bob");

// query.or()
UserTypedModel.query("id").eq(1).or().where("name").eq("Bob");

// query.not()
UserTypedModel.query("id").not().eq(1);
UserTypedModel.query("id").not().between(1, 2);

// query.parenthesis(condition)
UserTypedModel.query("id").eq(1).and().parenthesis(new Condition().where("name").eq("Bob"));
UserTypedModel.query("id").eq(1).and().parenthesis((condition) => condition.where("name").eq("Bob"));

// query.group(condition)
UserTypedModel.query("id").eq(1).and().group(new Condition().where("name").eq("Bob"));
UserTypedModel.query("id").eq(1).and().group((condition) => condition.where("name").eq("Bob"));

// query.filter(key)
UserTypedModel.query().filter("id");
UserTypedModel.query().filter("id").eq(1);

// query.where(key)
UserTypedModel.query().where("id");
UserTypedModel.query().where("id").eq(1);

// query.attribute(key)
UserTypedModel.query().attribute("id");
UserTypedModel.query().attribute("id").eq(1);

// query.eq(value)
UserTypedModel.query().filter("name").eq("Tom");

// query.exists()
UserTypedModel.query().filter("phoneNumber").exists();
UserTypedModel.query().filter("phoneNumber").not().exists();

// query.lt(value)
UserTypedModel.query().filter("age").lt(5);

// query.le(value)
UserTypedModel.query().filter("age").le(5);

// query.gt(value)
UserTypedModel.query().filter("age").gt(5);

// query.ge(value)
UserTypedModel.query().filter("age").ge(5);

// query.beginsWith(value)
UserTypedModel.query().filter("name").beginsWith("T");

// query.contains(value)
UserTypedModel.query().filter("name").contains("om");

// query.in(values)
UserTypedModel.query("name").in(["Charlie", "Bob"]);

// query.between(a, b)
UserTypedModel.query().filter("age").between(5, 9);
