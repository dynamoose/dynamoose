import {ObjectType} from "../General";

// js-object-utilities' entries checks each nested object for a cycle by walking its whole subtree, so
// its cost grows with the size of the object times its depth. Tracking the ancestors of the current
// object gives the same entries for an object without cycles, and stops at a cycle instead of
// overflowing the stack.
export function entries (object: ObjectType, existingKey = ""): [string, any][] {
	const result: [string, any][] = [];
	const ancestors = new Set<any>();
	const walk = (value: ObjectType, prefix: string): void => {
		ancestors.add(value);
		for (const [key, child] of Object.entries(value)) {
			const fullKey = prefix ? `${prefix}.${key}` : key;
			result.push([fullKey, child]);
			if (typeof child === "object" && child !== null && !(child instanceof Buffer) && !ancestors.has(child)) {
				walk(child, fullKey);
			}
		}
		ancestors.delete(value);
	};
	walk(object, existingKey);
	return result;
}

export function keys (object: ObjectType, existingKey = ""): string[] {
	return entries(object, existingKey).map((entry) => entry[0]);
}
