import * as object from "js-object-utilities";
import {ObjectType} from "../General";

// Copies plain objects (including ones without a prototype) and arrays, keeping holes in arrays and an own `__proto__` key (as `JSON.parse` creates).
function shallowCopy (value: unknown): ObjectType | undefined {
	if (value === null || typeof value !== "object") {
		return undefined;
	}
	if (Array.isArray(value)) {
		return value.slice();
	}
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) {
		return undefined;
	}
	// `Object.assign` (and object spread, which TypeScript compiles to it) would pass an own `__proto__` key to the `__proto__` setter instead of copying it.
	if (Object.prototype.hasOwnProperty.call(value, "__proto__")) {
		return Object.defineProperties(Object.create(prototype), Object.getOwnPropertyDescriptors(value));
	}
	return Object.assign(Object.create(prototype), value);
}

// Path parts that reach a prototype when an object doesn't have them as its own property.
const prototypeKeys = ["__proto__", "constructor", "prototype"];

// Deletes `paths` from a copy of `input`, the same way `object.delete` does, without changing `input` or the plain objects and arrays nested in it.
// Paths are applied one at a time, copying the own plain objects and arrays along each path right before deleting it, so a path whose list positions
// shifted after an earlier deletion still only reaches copies. Everything else in the result is still shared with `input`. A path through an inherited
// `__proto__`, `constructor` or `prototype` property is skipped, because it could only delete from a prototype shared by the whole process.
export default function object_delete_copy (input: ObjectType, paths: string | string[]): ObjectType {
	const result = shallowCopy(input) ?? {...input};
	// Objects and arrays this call created: changing them can't change `input`, and a later path through them doesn't copy them again.
	const copies = new WeakSet<object>([result]);
	for (const path of Array.isArray(paths) ? paths : [paths]) {
		// `object.delete` also accepts numbers, and throws for other values, which it still does below.
		const parts = typeof path === "string" || typeof path === "number" ? String(path).split(".") : [];
		parts.pop();
		let parent: any = result;
		let reachesPrototype = false;
		for (const part of parts) {
			if (parent === null || parent === undefined) {
				break;
			}
			const own = Object.prototype.hasOwnProperty.call(Object(parent), part);
			if (!own && prototypeKeys.includes(part)) {
				reachesPrototype = true;
				break;
			}
			let value = parent[part];
			if (own && copies.has(parent) && !copies.has(value)) {
				const copy = shallowCopy(value);
				if (copy) {
					copies.add(copy);
					parent[part] = copy;
					value = copy;
				}
			}
			parent = value;
		}
		if (!reachesPrototype) {
			// Deletes in place, from the copies made above.
			object.delete(result, [path]);
		}
	}
	return result;
}
