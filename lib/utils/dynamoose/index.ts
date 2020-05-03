import get_provisioned_throughput from "./get_provisioned_throughput";
import wildcard_allowed_check from "./wildcard_allowed_check";
import index_changes from "./index_changes";
import convertConditionArrayRequestObjectToString from "./convertConditionArrayRequestObjectToString";
import { documentToJSON } from "./documentToJSON";

export = {
	get_provisioned_throughput,
	wildcard_allowed_check,
	index_changes,
	convertConditionArrayRequestObjectToString,
	documentToJSON
};
