const {runSuite} = require("../harness");
const {Condition} = require("../../dist");

async function run () {
	await runSuite("condition", (bench) => {
		bench.add("Condition - simple equality", () => {
			new Condition("id").eq("5");
		});

		bench.add("Condition - from object", () => {
			new Condition({"id": "5"});
		});

		bench.add("Condition - from object with operator", () => {
			new Condition({"id": {"eq": "5"}});
		});

		bench.add("Condition - AND chain (3 conditions)", () => {
			new Condition("id").eq("5").and().where("name").eq("John").and().where("age").gt(20);
		});

		bench.add("Condition - OR chain (3 conditions)", () => {
			new Condition("status").eq("active").or().where("role").eq("admin").or().where("score").gt(90);
		});

		bench.add("Condition - complex (AND + OR + NOT)", () => {
			new Condition("id").eq("5")
				.and()
				.where("status").eq("active")
				.or()
				.not().where("deleted").eq(true)
				.and()
				.where("age").between(18, 65);
		});

		bench.add("Condition - with parenthesis/groups", () => {
			new Condition("type").eq("user").and().parenthesis(
				new Condition("status").eq("active").or().where("role").eq("admin")
			);
		});

		bench.add("Condition - beginsWith", () => {
			new Condition("sk").beginsWith("USER#");
		});

		bench.add("Condition - contains", () => {
			new Condition("tags").contains("premium");
		});

		bench.add("Condition - exists check", () => {
			new Condition("email").exists();
		});

		bench.add("Condition - in operator", () => {
			new Condition("status").in(["active", "pending", "review"]);
		});

		bench.add("Condition - between operator", () => {
			new Condition("age").between(18, 65);
		});

		bench.add("Condition - long chain (10 conditions)", () => {
			new Condition("f0").eq("v0")
				.and().where("f1").eq("v1")
				.and().where("f2").gt(2)
				.and().where("f3").lt(100)
				.and().where("f4").beginsWith("prefix")
				.and().where("f5").contains("value")
				.and().where("f6").exists()
				.and().where("f7").between(0, 50)
				.and().where("f8").eq("v8")
				.and().where("f9").eq("v9");
		});
	});
}

module.exports = run;
