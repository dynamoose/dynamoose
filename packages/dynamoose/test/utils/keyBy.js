const utils = require("../../dist/utils").default;

describe("keyBy", () => {
	it("Should be a function", () => {
		expect(utils.keyBy).toBeInstanceOf(Function);
	});

	const tests = [
		{
			"input": [[{"id": "1", "name": "One"}, {"id": "2", "name": "Two"}], "id"],
			"output": {"1": {"id": "1", "name": "One"}, "2": {"id": "2", "name": "Two"}}
		},
		{
			"input": [Object.values({"data": {"id": "1", "name": "One"}}), "id"],
			"output": {"1": {"id": "1", "name": "One"}}
		}
	];
	tests.forEach((test) => {
		it(`Should return ${JSON.stringify(test.output)} for ${JSON.stringify(test.input)}`, () => {
			expect(utils.keyBy(...test.input)).toEqual(test.output);
		});
	});
});
