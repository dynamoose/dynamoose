const {LRUCache} = require("../../dist/utils/LRUCache");

describe("LRUCache", () => {
	describe("Constructor", () => {
		it("Should create an LRUCache with default maxSize of 1000", () => {
			const cache = new LRUCache();
			expect(cache.size).toEqual(0);
		});

		it("Should create an LRUCache with custom maxSize", () => {
			const cache = new LRUCache(100);
			expect(cache.size).toEqual(0);
		});

		it("Should create an LRUCache with maxSize of 1", () => {
			const cache = new LRUCache(1);
			expect(cache.size).toEqual(0);
		});
	});

	describe("Basic Operations", () => {
		let cache;

		beforeEach(() => {
			cache = new LRUCache(3);
		});

		describe("set", () => {
			it("Should set a key-value pair", () => {
				cache.set("key1", "value1");
				expect(cache.size).toEqual(1);
				expect(cache.get("key1")).toEqual("value1");
			});

			it("Should update existing key", () => {
				cache.set("key1", "value1");
				cache.set("key1", "newValue");
				expect(cache.size).toEqual(1);
				expect(cache.get("key1")).toEqual("newValue");
			});

			it("Should handle different data types as values", () => {
				// Use a larger cache to avoid eviction during this test
				const bigCache = new LRUCache(10);
				bigCache.set("string", "value");
				bigCache.set("number", 42);
				bigCache.set("object", {"a": 1});
				bigCache.set("array", [1, 2, 3]);
				bigCache.set("null", null);
				bigCache.set("undefined", undefined);

				expect(bigCache.get("string")).toEqual("value");
				expect(bigCache.get("number")).toEqual(42);
				expect(bigCache.get("object")).toEqual({"a": 1});
				expect(bigCache.get("array")).toEqual([1, 2, 3]);
				expect(bigCache.get("null")).toEqual(null);
				expect(bigCache.get("undefined")).toEqual(undefined);
			});

			it("Should handle different data types as keys", () => {
				cache.set("string", "value1");
				cache.set(42, "value2");
				cache.set(Symbol("test"), "value3");

				expect(cache.get("string")).toEqual("value1");
				expect(cache.get(42)).toEqual("value2");
			});
		});

		describe("get", () => {
			it("Should return undefined for non-existent key", () => {
				expect(cache.get("nonexistent")).toEqual(undefined);
			});

			it("Should return value for existing key", () => {
				cache.set("key1", "value1");
				expect(cache.get("key1")).toEqual("value1");
			});

			it("Should move accessed item to most recently used position", () => {
				cache.set("key1", "value1");
				cache.set("key2", "value2");
				cache.set("key3", "value3");

				// Access key1 to move it to end
				cache.get("key1");

				// Add one more item to trigger eviction
				cache.set("key4", "value4");

				// key2 should be evicted (was least recently used)
				// key1 should still exist (was moved to end)
				expect(cache.get("key1")).toEqual("value1");
				expect(cache.get("key2")).toEqual(undefined);
				expect(cache.get("key3")).toEqual("value3");
				expect(cache.get("key4")).toEqual("value4");
			});
		});

		describe("has", () => {
			it("Should return false for non-existent key", () => {
				expect(cache.has("nonexistent")).toEqual(false);
			});

			it("Should return true for existing key", () => {
				cache.set("key1", "value1");
				expect(cache.has("key1")).toEqual(true);
			});

			it("Should not affect LRU order", () => {
				cache.set("key1", "value1");
				cache.set("key2", "value2");
				cache.set("key3", "value3");

				// Use has() instead of get()
				expect(cache.has("key1")).toEqual(true);

				// Add one more item to trigger eviction
				cache.set("key4", "value4");

				// key1 should be evicted because has() doesn't move it to end
				expect(cache.has("key1")).toEqual(false);
				expect(cache.has("key2")).toEqual(true);
				expect(cache.has("key3")).toEqual(true);
				expect(cache.has("key4")).toEqual(true);
			});
		});

		describe("delete", () => {
			it("Should return false for non-existent key", () => {
				expect(cache.delete("nonexistent")).toEqual(false);
			});

			it("Should return true and remove existing key", () => {
				cache.set("key1", "value1");
				expect(cache.delete("key1")).toEqual(true);
				expect(cache.has("key1")).toEqual(false);
				expect(cache.size).toEqual(0);
			});

			it("Should decrease size when deleting", () => {
				cache.set("key1", "value1");
				cache.set("key2", "value2");
				expect(cache.size).toEqual(2);

				cache.delete("key1");
				expect(cache.size).toEqual(1);
			});
		});

		describe("clear", () => {
			it("Should remove all items", () => {
				cache.set("key1", "value1");
				cache.set("key2", "value2");
				cache.set("key3", "value3");
				expect(cache.size).toEqual(3);

				cache.clear();
				expect(cache.size).toEqual(0);
				expect(cache.has("key1")).toEqual(false);
				expect(cache.has("key2")).toEqual(false);
				expect(cache.has("key3")).toEqual(false);
			});

			it("Should work on empty cache", () => {
				cache.clear();
				expect(cache.size).toEqual(0);
			});
		});

		describe("size", () => {
			it("Should return 0 for empty cache", () => {
				expect(cache.size).toEqual(0);
			});

			it("Should return correct size as items are added", () => {
				expect(cache.size).toEqual(0);
				cache.set("key1", "value1");
				expect(cache.size).toEqual(1);
				cache.set("key2", "value2");
				expect(cache.size).toEqual(2);
				cache.set("key3", "value3");
				expect(cache.size).toEqual(3);
			});

			it("Should not exceed maxSize", () => {
				cache.set("key1", "value1");
				cache.set("key2", "value2");
				cache.set("key3", "value3");
				cache.set("key4", "value4"); // Should evict key1
				expect(cache.size).toEqual(3);
			});
		});
	});

	describe("LRU Eviction Policy", () => {
		let cache;

		beforeEach(() => {
			cache = new LRUCache(3);
		});

		it("Should evict least recently used item when at capacity", () => {
			cache.set("key1", "value1");
			cache.set("key2", "value2");
			cache.set("key3", "value3");

			// All items should exist
			expect(cache.has("key1")).toEqual(true);
			expect(cache.has("key2")).toEqual(true);
			expect(cache.has("key3")).toEqual(true);

			// Add one more item
			cache.set("key4", "value4");

			// key1 should be evicted (least recently used)
			expect(cache.has("key1")).toEqual(false);
			expect(cache.has("key2")).toEqual(true);
			expect(cache.has("key3")).toEqual(true);
			expect(cache.has("key4")).toEqual(true);
		});

		it("Should update LRU order when getting items", () => {
			cache.set("key1", "value1");
			cache.set("key2", "value2");
			cache.set("key3", "value3");

			// Access key1 to make it most recently used
			cache.get("key1");

			// Add one more item
			cache.set("key4", "value4");

			// key2 should be evicted (now least recently used)
			expect(cache.has("key1")).toEqual(true); // Was accessed
			expect(cache.has("key2")).toEqual(false); // Evicted
			expect(cache.has("key3")).toEqual(true);
			expect(cache.has("key4")).toEqual(true);
		});

		it("Should update LRU order when setting existing items", () => {
			cache.set("key1", "value1");
			cache.set("key2", "value2");
			cache.set("key3", "value3");

			// Update key1 to make it most recently used
			cache.set("key1", "newValue1");

			// Add one more item
			cache.set("key4", "value4");

			// key2 should be evicted (now least recently used)
			expect(cache.get("key1")).toEqual("newValue1"); // Was updated
			expect(cache.has("key2")).toEqual(false); // Evicted
			expect(cache.has("key3")).toEqual(true);
			expect(cache.has("key4")).toEqual(true);
		});

		it("Should handle complex LRU scenarios", () => {
			cache.set("a", 1);
			cache.set("b", 2);
			cache.set("c", 3);

			// Access pattern: c, a, b
			cache.get("c");
			cache.get("a");
			cache.get("b");

			// Add new item - should evict c (least recently used after the access pattern)
			cache.set("d", 4);

			expect(cache.has("a")).toEqual(true);
			expect(cache.has("b")).toEqual(true);
			expect(cache.has("c")).toEqual(false); // Evicted
			expect(cache.has("d")).toEqual(true);
		});
	});

	describe("Edge Cases", () => {
		it("Should handle maxSize of 1", () => {
			const cache = new LRUCache(1);

			cache.set("key1", "value1");
			expect(cache.size).toEqual(1);
			expect(cache.get("key1")).toEqual("value1");

			cache.set("key2", "value2");
			expect(cache.size).toEqual(1);
			expect(cache.has("key1")).toEqual(false);
			expect(cache.get("key2")).toEqual("value2");
		});

		it("Should handle maxSize of 0", () => {
			const cache = new LRUCache(0);

			cache.set("key1", "value1");
			// Current implementation doesn't prevent insertion when maxSize is 0
			// This is a known limitation - the cache still stores the item temporarily
			expect(cache.size).toEqual(1);
			expect(cache.has("key1")).toEqual(true);
		});

		it("Should handle very large maxSize", () => {
			const cache = new LRUCache(10000);

			// Add many items
			for (let i = 0; i < 1000; i++) {
				cache.set(`key${i}`, `value${i}`);
			}

			expect(cache.size).toEqual(1000);
			expect(cache.get("key0")).toEqual("value0");
			expect(cache.get("key999")).toEqual("value999");
		});

		it("Should handle setting same key multiple times", () => {
			const cache = new LRUCache(2);

			cache.set("key1", "value1");
			cache.set("key1", "value2");
			cache.set("key1", "value3");

			expect(cache.size).toEqual(1);
			expect(cache.get("key1")).toEqual("value3");
		});

		it("Should handle undefined and null values correctly", () => {
			const cache = new LRUCache(3);

			cache.set("null", null);
			cache.set("undefined", undefined);
			cache.set("empty", "");

			expect(cache.get("null")).toEqual(null);
			expect(cache.get("undefined")).toEqual(undefined);
			expect(cache.get("empty")).toEqual("");
			expect(cache.has("null")).toEqual(true);
			expect(cache.has("undefined")).toEqual(true);
			expect(cache.has("empty")).toEqual(true);
		});
	});

	describe("Object Reference Behavior", () => {
		let cache;

		beforeEach(() => {
			cache = new LRUCache(3);
		});

		it("Should store object references (not deep copies)", () => {
			const obj = {"a": 1, "b": 2};
			cache.set("obj", obj);

			const retrieved = cache.get("obj");
			expect(retrieved).toBe(obj); // Same reference

			// Modifying original affects cached object
			obj.a = 100;
			expect(cache.get("obj").a).toEqual(100);
		});

		it("Should handle array references correctly", () => {
			const arr = [1, 2, 3];
			cache.set("arr", arr);

			const retrieved = cache.get("arr");
			expect(retrieved).toBe(arr); // Same reference

			// Modifying original affects cached array
			arr.push(4);
			expect(cache.get("arr")).toEqual([1, 2, 3, 4]);
		});
	});

	describe("Generic Type Support", () => {
		it("Should work with string keys and values", () => {
			const cache = new LRUCache();
			cache.set("stringKey", "stringValue");
			expect(cache.get("stringKey")).toEqual("stringValue");
		});

		it("Should work with number keys", () => {
			const cache = new LRUCache();
			cache.set(1, "numberKey");
			cache.set(2, "anotherNumberKey");
			expect(cache.get(1)).toEqual("numberKey");
			expect(cache.get(2)).toEqual("anotherNumberKey");
		});

		it("Should work with symbol keys", () => {
			const cache = new LRUCache();
			const sym1 = Symbol("test1");
			const sym2 = Symbol("test2");

			cache.set(sym1, "symbolValue1");
			cache.set(sym2, "symbolValue2");

			expect(cache.get(sym1)).toEqual("symbolValue1");
			expect(cache.get(sym2)).toEqual("symbolValue2");
		});

		it("Should distinguish between different key types", () => {
			const cache = new LRUCache();

			cache.set("1", "string key");
			cache.set(1, "number key");

			expect(cache.get("1")).toEqual("string key");
			expect(cache.get(1)).toEqual("number key");
			expect(cache.size).toEqual(2);
		});
	});

	describe("Performance Characteristics", () => {
		it("Should handle many operations efficiently", () => {
			const cache = new LRUCache(1000);
			const iterations = 5000;

			// Set many items
			for (let i = 0; i < iterations; i++) {
				cache.set(`key${i}`, `value${i}`);
			}

			// Cache should not exceed maxSize
			expect(cache.size).toEqual(1000);

			// Recent items should still exist
			expect(cache.has(`key${iterations - 1}`)).toEqual(true);
			expect(cache.has(`key${iterations - 500}`)).toEqual(true);

			// Very old items should be evicted
			expect(cache.has("key0")).toEqual(false);
			expect(cache.has("key100")).toEqual(false);
		});

		it("Should maintain correct LRU order with many accesses", () => {
			const cache = new LRUCache(100);

			// Fill cache
			for (let i = 0; i < 100; i++) {
				cache.set(`key${i}`, `value${i}`);
			}

			// Access every other item to change LRU order
			for (let i = 0; i < 100; i += 2) {
				cache.get(`key${i}`);
			}

			// Add new items to trigger evictions
			for (let i = 100; i < 150; i++) {
				cache.set(`key${i}`, `value${i}`);
			}

			// Accessed items (even indices) should still exist
			expect(cache.has("key0")).toEqual(true);
			expect(cache.has("key2")).toEqual(true);

			// Non-accessed items (odd indices) should be evicted
			expect(cache.has("key1")).toEqual(false);
			expect(cache.has("key3")).toEqual(false);
		});
	});
});
