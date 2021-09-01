import * as cloneDeep from "lodash.clonedeep";

export default function deep_copy<T> (obj: T): T {
	return cloneDeep(obj);
}
