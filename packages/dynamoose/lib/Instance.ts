import {AWS} from "./aws";
import {Model} from "./Model";
import {Table as PrimaryTable, TableOptionsOptional} from "./Table";
import {TableOptionsAccessor} from "./Table/defaults";

export interface PrimaryTableInterface extends PrimaryTable {
	new (name: string, models: Model[], options?: TableOptionsOptional): PrimaryTable;
}

export class Instance {
	static default: Instance = new Instance();

	aws: AWS;
	Table: PrimaryTableInterface & {"defaults": TableOptionsAccessor};

	/**
	 * This class allows you to create a new instance of Dynamoose, allowing for easy multi-region AWS requests.
	 *
	 * By default Dynamoose will create a default instance for you automatically. This both ensures backwards compatibility, and allows for an easy to use API for users not using this feature.
	 *
	 * ```js
	 * const otherDynamooseInstance = new dynamoose.Instance();
	 * ```
	 */
	constructor () {
		this.aws = new AWS();
		this.Table = getInstanceTable(this) as any;
	}
}

function getInstanceTable (instance: Instance) {
	class Table extends PrimaryTable {
		constructor (name: string, models: Model[], options: TableOptionsOptional) {
			super(instance, name, models, options);
		}
	}

	return Table;
}
