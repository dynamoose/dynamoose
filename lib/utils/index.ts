import * as combine_objects from "./combine_objects";
import * as merge_objects from "./merge_objects";
import timeout = require("./timeout");
import capitalize_first_letter = require("./capitalize_first_letter");
import set_immediate_promise = require("./set_immediate_promise");
import unique_array_elements = require("./unique_array_elements");
import array_flatten = require("./array_flatten");
import empty_function = require("./empty_function");
import object = require("./object");
import dynamoose = require("./dynamoose");

export = {
	combine_objects,
	merge_objects,
	timeout,
	capitalize_first_letter,
	set_immediate_promise,
	unique_array_elements,
	array_flatten,
	empty_function,
	object,
	dynamoose
};
