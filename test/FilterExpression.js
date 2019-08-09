'use strict';
const should = require('should');
const FilterExpression = require('../lib/FilterExpression');

describe.only('FilterExpression', () => {
  let expression;

  beforeEach(() => {
    expression = new FilterExpression();
  });

  it('returns null if no operations', () => should(expression.toString()).be.null());

  it('can filter an attribute', () => {
    expression.filter('foo').comparison('=', '42');
    expression.toString().should.equal('#attr1 = :val1');
  });

  it('can combine filters with and', () => {
    expression.filter('foo').comparison('>', 24).and().comparison('<', 35);
    expression.toString().should.equal('#attr1 > :val1 AND #attr1 < :val2');
  });

  it('can combine filters with or', () => {
    expression.filter('fizz').comparison('=', 'buzz').or().comparison('=', 'fuzz');
    expression.toString().should.equal('#attr1 = :val1 OR #attr1 = :val2');
  });

  it('can negate filters with not', () => {
    expression.not().filter('fizz').comparison('=', 'buzz');
    expression.toString().should.equal('NOT #attr1 = :val1');
  });

  it('can construct attribute_exists filter', () => {
    expression.filter('foo').func('attribute_exists');
    expression.toString().should.equal('attribute_exists(#attr1)');
  });

  it('can construct attribute_not_exists filter', () => {
    expression.filter('foo').func('attribute_not_exists');
    expression.toString().should.equal('attribute_not_exists(#attr1)');
  });

  it('can construct attribute_type filter', () => {
    expression.filter('fizz').func('attribute_type', 'SS');
    expression.toString().should.equal('attribute_type(#attr1, :val1)');
  });

  it('can construct begins_with filter', () => {
    expression.filter('fizz').func('begins_with', 'foo');
    expression.toString().should.equal('begins_with(#attr1, :val1)');
  });

  it('can construct contains filter', () => {
    expression.filter('fizz').func('contains', 'foo');
    expression.toString().should.equal('contains(#attr1, :val1)');
  });

  it('can combine functions', () => {
    expression.filter('foo').comparison('=', 'bar').and().filter('fizz').func('contains', 'buzz');
    expression.toString().should.equal('#attr1 = :val1 AND contains(#attr2, :val2)');
  });

  it('can construct IN filter', () => {
    expression.filter('foo').in(['fizz', 'buzz', 'bar']);
    expression.toString().should.equal('#attr1 IN (:val1, :val2, :val3)');
  });

  it('can construct BETWEEN filter', () => {
    expression.filter('time').between('2019-01-01', '2019-12-31');
    expression.toString().should.equal('#attr1 BETWEEN :val1 AND :val2');
  });

  it('cannot perform a comparison without an attribute', () => {
    should.throws(() => expression.comparison('=', 42), 'comparison "=" must be preceded by a filter(attribute) call.');
  });

  it('cannot perform a function without an attribute', () => {
    should.throws(() => expression.func('begins_with', 42), 'function "=" must be preceded by a filter(attribute) call.');
  });

  it('cannot construct IN filter without an attribute', () => {
    should.throws(() => expression.in([1, 2, 3]), 'operation "IN" must be preceded by a filter(attribute) call.');
  });

  it('cannot construct BETWEEN filter without an attribute', () => {
    should.throws(() => expression.between(10, 42), 'operation "BETWEEN" must be preceded by a filter(attribute) call.');
  });
});
