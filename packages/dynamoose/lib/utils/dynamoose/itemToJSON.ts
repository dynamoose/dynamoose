import {ItemArray, ObjectType} from "../../General";
import {Item} from "../../Item";

// TODO optimize this in the future after we add performance tests. Doing `JSON.parse(JSON.stringify()) can be kinda slow.
export function itemToJSON (this: Item | ItemArray<Item>): ObjectType {
	return JSON.parse(JSON.stringify(Array.isArray(this) ? [...this] : {...this}));
}
