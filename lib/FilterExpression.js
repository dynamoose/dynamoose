'use strict';
const AWS = require('aws-sdk');
const errors = require('./errors');

function FilterExpressionNode (operation, attribute, value) {
  this.operation = operation;
  this.attribute = attribute;
  this.value = value;

  this.prev = null;
  this.next = null;
}

function FilterExpression () {
  this.head = null;
  this.tail = null;

  this.nameIndex = 1;
  this.valueIndex = 1;

  this.attributeNames = {};
  this.attributeValues = {};

  this.currentFilterAttribute = null;
}

FilterExpression.prototype.addNode = function (node) {
  if (!this.head) {
    this.head = node;
    this.tail = node;
  } else if (this.tail) {
    this.tail.next = node;
    node.prev = this.tail;
    this.tail = node;
  }
};

FilterExpression.prototype.addName = function (name) {
  const attributeName = `#attr${this.nameIndex}`;
  this.nameIndex = this.nameIndex + 1;

  this.attributeNames[attributeName] = name;

  return attributeName;
};

FilterExpression.prototype.addValue = function (value) {
  const attributeName = `:val${this.valueIndex}`;
  this.valueIndex = this.valueIndex + 1;

  const attributeValue = AWS.DynamoDB.Converter.input(value);
  this.attributeValues[attributeName] = attributeValue;

  return attributeName;
};

FilterExpression.prototype.filter = function (attribute) {
  this.currentFilterAttribute = this.addName(attribute);
  return this;
};

FilterExpression.prototype.and = function () {
  this.addNode(new FilterExpressionNode('AND'));
  return this;
};

FilterExpression.prototype.or = function () {
  this.addNode(new FilterExpressionNode('OR'));
  return this;
};

FilterExpression.prototype.not = function () {
  this.addNode(new FilterExpressionNode('NOT'));
  return this;
};

FilterExpression.prototype.comparison = function (operation, value) {
  if (!this.currentFilterAttribute) {
    throw new errors.FilterExpressionError(`comparison "${operation}" must be preceded by a filter(attribute) call.`);
  }

  const valueName = this.addValue(value);
  this.addNode(new FilterExpressionNode(operation, this.currentFilterAttribute, valueName));
  return this;
};

FilterExpression.prototype.func = function (func, value) {
  if (!this.currentFilterAttribute) {
    throw new errors.FilterExpressionError(`function "${func}" must be preceded by a filter(attribute) call.`);
  }

  const valueName = value ? this.addValue(value) : null;
  this.addNode(new FilterExpressionNode(func, this.currentFilterAttribute, valueName));
  return this;
};

FilterExpression.prototype.in = function (values) {
  if (!this.currentFilterAttribute) {
    throw new errors.FilterExpressionError('operation "IN" must be preceded by a filter(attribute) call.');
  }

  const valueNames = values.map((value) => this.addValue(value));
  this.addNode(new FilterExpressionNode('IN', this.currentFilterAttribute, valueNames));
  return this;
};

FilterExpression.prototype.between = function (op1, op2) {
  if (!this.currentFilterAttribute) {
    throw new errors.FilterExpressionError('operation "BETWEEN" must be preceded by a filter(attribute) call.');
  }

  const op1Name = this.addValue(op1);
  const op2Name = this.addValue(op2);
  this.addNode(new FilterExpressionNode('BETWEEN', this.currentFilterAttribute, [op1Name, op2Name]));
  return this;
};

const isFunction = (node) => ['attribute_exists', 'attribute_not_exists', 'attribute_type', 'begins_with', 'contains'].includes(node.operation.toLowerCase());

FilterExpression.prototype.toString = function () {
  let node = this.head;
  let filterExpressionString = '';
  if (!node) {
    return null;
  }

  while (node) {
    if (isFunction(node)) {
      const value = node.value ? `, ${node.value}` : '';
      filterExpressionString += `${node.operation}(${node.attribute}${value})`;
    } else if (node.operation === 'BETWEEN') {
      filterExpressionString += `${node.attribute} BETWEEN ${node.value[0]} AND ${node.value[1]}`;
    } else if (node.operation === 'IN') {
      const values = node.value.join(', ');
      filterExpressionString += `${node.attribute} IN (${values})`;
    } else {
      const genericFilterPart = [node.attribute, node.operation, node.value].filter((part) => part).join(' ');
      filterExpressionString += genericFilterPart;
    }

    filterExpressionString += ' ';
    node = node.next;
  }

  return filterExpressionString.trim();
};

module.exports = FilterExpression;
