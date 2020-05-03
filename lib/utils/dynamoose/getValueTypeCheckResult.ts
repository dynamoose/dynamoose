import { Schema, DynamoDBTypeResult, DynamoDBSetTypeResult } from "../../Schema";

export = (schema: Schema, value: any, key: string, settings: {"type": "toDynamo" | "fromDynamo"}, options = {}): {typeDetails: DynamoDBTypeResult | DynamoDBSetTypeResult; isValidType: boolean} => {
	const typeDetails = schema.getAttributeTypeDetails(key, options);
	const isValidType = [((typeDetails.customType || {}).functions || {}).isOfType, typeDetails.isOfType].filter((a) => Boolean(a)).some((func) => func(value, settings.type));
	return {typeDetails, isValidType};
};
