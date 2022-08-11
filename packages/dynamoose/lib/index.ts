import {Model} from "./Model";
import {Schema, SchemaDefinition} from "./Schema";
import {Condition} from "./Condition";
import transaction from "./Transaction";
import utils from "./utils";
import {Item, AnyItem} from "./Item";
import ModelStore from "./ModelStore";
import {ModelType} from "./General";
import CustomError from "./Error";
import {Table, TableOptionsOptional} from "./Table/index";
import type from "./type";
import {Instance} from "./Instance";
import {custom as TableDefaults} from "./Table/defaults";
import returnModel from "./utils/dynamoose/returnModel";

const model = <T extends Item = AnyItem>(name: string, schema?: Schema | SchemaDefinition | (Schema | SchemaDefinition)[], options?: TableOptionsOptional): ModelType<T> => {
	let model: Model<T>;
	let storedSchema: Model<T>;
	if (name) {
		storedSchema = ModelStore<T>(name);
	}
	// TODO: this is something I'd like to do. But is a breaking change. Need to enable this and uncomment it in a breaking release. Also will need to fix the tests as well.
	/* if (schema && storedSchema) {
		throw new CustomError.InvalidParameter(`Model with name ${name} has already been registered.`);
	} else */
	if (!schema && storedSchema) {
		model = storedSchema;
	} else {
		model = new Model(name, schema, options, ModelStore);
	}

	return returnModel(model);
};
Table.defaults = {
	...TableDefaults as any
};

export = {
	/**
	 * This method is the basic entry point for creating a model in Dynamoose. When you call this method a new model is created, and it returns a Item initializer that you can use to create instances of the given model.
	 *
	 * The `name` parameter is a string representing the table name that will be used to store items created by this model.
	 *
	 * The `schema` parameter can either be an object OR a [Schema](Schema.md) instance. If you pass in an object for the `schema` parameter it will create a Schema instance for you automatically.
	 *
	 * ```js
	 * const dynamoose = require("dynamoose");
	 *
	 * const Cat = dynamoose.model("Cat", {"name": String});
	 *
	 * const Cat = dynamoose.model("Cat", new dynamoose.Schema({"name": String}));
	 * ```
	 *
	 * An optional TypeScript class which extends `Item` can be provided right before the function bracket. This provides type checking when using operations like `Model.create()`.
	 *
	 * ```ts
	 * import * as dynamoose from "dynamoose";
	 * import {Item} from "dynamoose/dist/Item";
	 *
	 * // Strongly typed model
	 * class Cat extends Item {
	 * 	id: number;
	 * 	name: string;
	 * }
	 * const CatModel = dynamoose.model<Cat>("Cat", {"id": Number, "name": String});
	 *
	 * // Will raise type checking error as random is not a valid field.
	 * CatModel.create({"id": 1, "random": "string"});
	 *
	 * // Will return the correct type of Cat
	 * const cat = await CatModel.get(1);
	 * ```
	 *
	 * You can also pass in an array of Schema instances or schema objects into the `schema` parameter. This is useful for cases of single table design where you want one model to have multiple options for a schema. Behind the scenes Dynamoose will automatically pick the closest schema to match to your item, and use that schema for all operations pertaining to that item. If no matching schema can be found, it will default to the first schema in the array.
	 *
	 * :::note
	 * If you use multiple schemas in one model, the hash & range keys must match for all schemas.
	 * :::
	 *
	 * ```js
	 * const Cat = dynamoose.model("Cat", [
	 * 	new dynamoose.Schema({"id": String, "name": String}),
	 * 	{"id": String, "age": Number}
	 * ]);
	 * ```
	 *
	 * If you don't pass the `schema` parameter it is required that you have an existing model already registered with that name. This will use the existing model already registered.
	 *
	 * ```js
	 * const Cat = dynamoose.model("Cat"); // Will reference existing model, or if no model exists already with name `Cat` it will throw an error.
	 * ```
	 *
	 * @param name The name of the model.
	 * @param schema The schema definition(s) for the model. This can either be a Schema instance, object representing a Schema, or an array of either.
	 * @returns The model instance.
	 */
	model,
	"Table": Instance.default.Table,
	Instance,
	Schema,
	Condition,
	transaction,
	"aws": Instance.default.aws,
	"logger": async () => {
		try {
			return await utils.importPackage("dynamoose-logger");
		} catch (error) {
			throw new CustomError.OtherError("dynamoose-logger has not been installed. Install it using `npm i --save-dev dynamoose-logger`.");
		}
	},
	type
};
