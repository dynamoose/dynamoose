const Attribute = require('../lib/Attribute');
const {expect} = require('chai');

describe.only('Attribute', () => {
	describe('lookupType', () => {
		it('Should be a function', () => {
			expect(Attribute.lookupType).to.be.a('function');
		});

		describe('From DynamoDB', () => {
			const tests = [
				{
					'input': {'S': 'Hello World'},
					'output': String
				},
				{
					'input': {'L': [{'N': 5}, {'N': 10}]},
					'output': Array
				},
				{
					'input': {'B': 'Hello World'},
					'output': Buffer
				},
				{
					'input': {'M': {'S': 'Hello World'}},
					'output': Object
				},
				{
					'input': {'BOOL': true},
					'output': Boolean
				},
				{
					'input': {'N': 5},
					'output': Number
				},
				{
					'input': {'NS': [5, 10, 15]},
					'output': [Number]
				},
				{
					'input': {'SS': ['Hello', 'World', '!']},
					'output': [Number]
				}
			];

			tests.forEach((test) => {
				const regexFuncName = /^Function ([^(]+)\(/i;
				const found = test.output.toString().match(regexFuncName);
				const type = found[1].toLowerCase();

				it(`Should return ${type} for ${JSON.stringify(test.input)}`, () => {
					expect(Attribute.lookupType(test.input)).to.eql(test.output);
				});
			});
		});
	});
});
