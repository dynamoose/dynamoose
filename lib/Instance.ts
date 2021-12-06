import DynamoDB = require("@aws-sdk/client-dynamodb");
import {AWS} from "./aws";
import {Model} from "./Model";
import {Table as PrimaryTable, TableOptionsOptional} from "./Table";

export interface InstanceSettings {
	ddb?: DynamoDB.DynamoDB;
}

interface PrimaryTableInterface extends PrimaryTable {
	new (name: string, models: Model[], options: TableOptionsOptional): PrimaryTable;
}

export class Instance {
	static default: Instance = new Instance();

	aws: AWS;
	Table: PrimaryTableInterface;

	constructor (settings?: InstanceSettings) {
		this.aws = new AWS();

		if (settings?.ddb) {
			this.aws.ddb.set(settings.ddb);
		}

		this.Table = getInstanceTable(this) as any;
	}
}

function getInstanceTable (instance: Instance) {
	class Table extends PrimaryTable {
		constructor (name: string, models: Model[], options: TableOptionsOptional = {}) {
			super(instance, name, models, options);
		}
	}

	return Table;
}
