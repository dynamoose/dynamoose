import { DocumentArray, ObjectType } from "../../General";
import { Document } from "../../Document";
// import object from "../object";

// TODO optimize this in the future after we add performance tests. Doing `JSON.parse(JSON.stringify()) can be kinda slow.
export function documentToJSON (this: Document | DocumentArray<Document>): ObjectType {
	return JSON.parse(JSON.stringify(Array.isArray(this) ? [...this] : {...this}));
}
