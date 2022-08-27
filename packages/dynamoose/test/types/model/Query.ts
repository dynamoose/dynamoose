/* eslint @typescript-eslint/no-unused-vars: 0, no-console: 0 */

import {UserTypedModel, UserModel, User} from "../Model";
import {SortOrder} from "../../../dist/General";
import {Condition} from "../../../dist";
import {AnyItem} from "../../../dist/Item";
import {QueryResponse, Query} from "../../../dist/ItemRetriever";

// query.exec([callback])
async function queryExec (): Promise<User[]> {
	return await UserTypedModel.query().exec();
}
async function queryExecUnTyped (): Promise<AnyItem[]> {
	return await UserModel.query().exec();
}

const queryExecUnTypedQueryResponse: Promise<QueryResponse<AnyItem>> = UserModel.query().exec();
const queryExecTyped: Promise<QueryResponse<User>> = UserTypedModel.query("name").eq("Will").exec();

let isAssignableToQuery : Query<User>;

// query.limit(count)
isAssignableToQuery = UserTypedModel.query("name").eq("Will").limit(5);

// query.startAt(key)
async function queryStartAt (): Promise<Query<User>> {
	const response = await UserTypedModel.query("name").eq("Will").exec();
	return UserTypedModel.query("name").eq("Will").startAt(response.lastKey);
}

// query.attributes(attributes)
isAssignableToQuery = UserTypedModel.query("name").eq("Will").attributes(["id", "name"]);

// query.count()
async function queryCount (): Promise<void> {
	const response = await UserTypedModel.query("name").eq("Will").count().exec();
	console.log(response);
}

// query.consistent()
isAssignableToQuery = UserTypedModel.query("name").eq("Will").consistent();

// query.using(index)
isAssignableToQuery = UserTypedModel.query("name").eq("Will").using("name-index");

// query.sort(order)
isAssignableToQuery = UserTypedModel.query("name").eq("Will").sort(SortOrder.ascending);
isAssignableToQuery = UserTypedModel.query("name").eq("Will").sort(SortOrder.descending);
isAssignableToQuery = UserTypedModel.query("name").eq("Will").sort("ascending");
isAssignableToQuery = UserTypedModel.query("name").eq("Will").sort("descending");

// query.all([delay[, max]])
isAssignableToQuery = UserTypedModel.query("name").eq("Will").all();
isAssignableToQuery = UserTypedModel.query("name").eq("Will").all(100);
isAssignableToQuery = UserTypedModel.query("name").eq("Will").all(0, 5);

// query.and()
isAssignableToQuery = UserTypedModel.query("id").eq(1).and().where("name").eq("Bob");
isAssignableToQuery = UserTypedModel.query("id").eq(1).where("name").eq("Bob");

// query.or()
isAssignableToQuery = UserTypedModel.query("id").eq(1).or().where("name").eq("Bob");

// query.not()
isAssignableToQuery = UserTypedModel.query("id").not().eq(1);
isAssignableToQuery = UserTypedModel.query("id").not().between(1, 2);

// query.parenthesis(condition)
isAssignableToQuery = UserTypedModel.query("id").eq(1).and().parenthesis(new Condition().where("name").eq("Bob"));
isAssignableToQuery = UserTypedModel.query("id").eq(1).and().parenthesis((condition) => condition.where("name").eq("Bob"));

// query.group(condition)
isAssignableToQuery = UserTypedModel.query("id").eq(1).and().group(new Condition().where("name").eq("Bob"));
isAssignableToQuery = UserTypedModel.query("id").eq(1).and().group((condition) => condition.where("name").eq("Bob"));

// query.filter(key)
isAssignableToQuery = UserTypedModel.query().filter("id");
isAssignableToQuery = UserTypedModel.query().filter("id").eq(1);

// query.where(key)
isAssignableToQuery = UserTypedModel.query().where("id");
isAssignableToQuery = UserTypedModel.query().where("id").eq(1);

// query.attribute(key)
isAssignableToQuery = UserTypedModel.query().attribute("id");
isAssignableToQuery = UserTypedModel.query().attribute("id").eq(1);

// query.eq(value)
isAssignableToQuery = UserTypedModel.query().filter("name").eq("Tom");

// query.exists()
isAssignableToQuery = UserTypedModel.query().filter("phoneNumber").exists();
isAssignableToQuery = UserTypedModel.query().filter("phoneNumber").not().exists();

// query.lt(value)
isAssignableToQuery = UserTypedModel.query().filter("age").lt(5);

// query.le(value)
isAssignableToQuery = UserTypedModel.query().filter("age").le(5);

// query.gt(value)
isAssignableToQuery = UserTypedModel.query().filter("age").gt(5);

// query.ge(value)
isAssignableToQuery = UserTypedModel.query().filter("age").ge(5);

// query.beginsWith(value)
isAssignableToQuery = UserTypedModel.query().filter("name").beginsWith("T");

// query.contains(value)
isAssignableToQuery = UserTypedModel.query().filter("name").contains("om");

// query.in(values)
isAssignableToQuery = UserTypedModel.query("name").in(["Charlie", "Bob"]);

// query.between(a, b)
isAssignableToQuery = UserTypedModel.query().filter("age").between(5, 9);
