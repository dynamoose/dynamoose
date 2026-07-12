import {ObjectType} from "../General";

// A drop-in, linear-time replacement for `js-object-utilities`' `entries` helper.
//
// The library version calls `isCircular(value)` before recursing into every nested
// node, and each `isCircular` performs a full walk of that node's subtree. That makes
// flattening a deeply nested object O(n^2), which dominates the cost of converting large
// scan/query result sets (issue #1719).
//
// This version guards against cycles in O(n) by tracking the ancestors on the current
// recursion path in a Set and refusing to descend into a value already on that path.
// For acyclic inputs (every DynamoDB item, and any object that has already been run
// through `deep_copy`, which strips cycles) the output is identical to the library's,
// key-for-key and in the same order.
function object_entries (object: ObjectType, existingKey = "", ancestors: Set<unknown> = new Set()): [string, any][] {
	const accumulator: [string, any][] = [];
	// Mark this node as being on the current recursion path. Sibling references that share
	// the same (non-cyclic) object still descend because each node is removed on the way
	// back up; only a value that is an ancestor of itself (a true cycle) is skipped.
	ancestors.add(object);
	for (const [key, value] of Object.entries(object)) {
		const keyWithExisting = `${existingKey ? `${existingKey}.` : ""}${key}`;
		accumulator.push([keyWithExisting, value]);
		if (typeof value === "object" && !(value instanceof Buffer) && value !== null && !ancestors.has(value)) {
			const nested = object_entries(value, keyWithExisting, ancestors);
			for (let i = 0; i < nested.length; i++) {
				accumulator.push(nested[i]);
			}
		}
	}
	ancestors.delete(object);
	return accumulator;
}

export default object_entries;
