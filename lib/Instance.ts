import {AWS} from "./aws";
import {Model} from "./Model";
import {Table as PrimaryTable, TableOptionsOptional} from "./Table";

export interface PrimaryTableInterface extends PrimaryTable {
	new (name: string, models: Model[], options: TableOptionsOptional): PrimaryTable;
}

export class Instance {
	static default: Instance = new Instance();

	aws: AWS;
	Table: PrimaryTableInterface;

	constructor () {
		this.aws = new AWS();
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
