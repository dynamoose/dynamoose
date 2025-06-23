/**
 * Simple LRU (Least Recently Used) Cache implementation
 * Prevents unbounded memory growth while maintaining performance benefits
 *
 * Note: This cache stores references to objects. Callers should ensure
 * they do not mutate cached objects to prevent cache corruption.
 */
export class LRUCache<K, V> {
	private readonly maxSize: number;
	private readonly cache: Map<K, V>;

	constructor(maxSize: number = 1000) {
		this.maxSize = maxSize;
		this.cache = new Map();
	}

	get(key: K): V | undefined {
		if (this.cache.has(key)) {
			// Move to end (most recently used)
			const value = this.cache.get(key)!;
			this.cache.delete(key);
			this.cache.set(key, value);
			return value;
		}
		return undefined;
	}

	set(key: K, value: V): void {
		if (this.cache.has(key)) {
			// Update existing key
			this.cache.delete(key);
		} else if (this.cache.size >= this.maxSize) {
			// Remove least recently used (first item)
			const firstKey = this.cache.keys().next().value;
			this.cache.delete(firstKey);
		}
		this.cache.set(key, value);
	}

	clear(): void {
		this.cache.clear();
	}

	get size(): number {
		return this.cache.size;
	}

	delete(key: K): boolean {
		return this.cache.delete(key);
	}

	has(key: K): boolean {
		return this.cache.has(key);
	}
}
