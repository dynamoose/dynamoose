import DDB from "./ddb";
import * as Converter from "./converter";
import {DDBInterface} from "./ddb";

export class AWS {
	public ddb: DDBInterface;
	public converter: typeof Converter;

	constructor () {
		this.ddb = DDB();
		this.converter = Converter;
	}
}
