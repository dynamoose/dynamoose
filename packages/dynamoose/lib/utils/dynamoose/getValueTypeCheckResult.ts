import {Schema, DynamoDBTypeResult, DynamoDBSetTypeResult} from "../../Schema";
import {ObjectType} from "../../General";

// export = (schema: Schema, value: any, key: string, settings: {"type": "toDynamo" | "fromDynamo"}, options = {}): {typeDetails: DynamoDBTypeResult | DynamoDBSetTypeResult; isValidType: boolean} => {
// 	const typeDetails = schema.getAttributeTypeDetails(key, options);
// 	const isValidType = [((typeDetails.customType || {}).functions || {}).isOfType, typeDetails.isOfType].filter((a) => Boolean(a)).some((func) => func(value, settings.type));
// 	return {typeDetails, isValidType};
// };

export default (schema: Schema, value: any, key: string, settings: { "type": "toDynamo" | "fromDynamo" }, options: { standardKey?: boolean; typeIndexOptionMap?: ObjectType }): {typeDetails: DynamoDBTypeResult | DynamoDBSetTypeResult | DynamoDBTypeResult[] | DynamoDBSetTypeResult[]; matchedTypeDetailsIndex: number; matchedTypeDetailsIndexes: number[]; matchedTypeDetails: DynamoDBTypeResult | DynamoDBSetTypeResult; typeDetailsArray: (DynamoDBTypeResult | DynamoDBSetTypeResult)[]; isValidType: boolean} => {
	const typeDetails = schema.getAttributeTypeDetails(key, options);
	const typeDetailsArray = Array.isArray(typeDetails) ? typeDetails : [typeDetails];
	const matchedTypeDetailsIndexes = typeDetailsArray.map((details, index) => {
		if ([details.customType?.functions?.isOfType, details.isOfType].filter((a) => Boolean(a)).some((func) => func(value, settings.type))) {
			return index;
		}
	}).filter((a) => a !== undefined);
	const matchedTypeDetailsIndex = matchedTypeDetailsIndexes[0];
	const matchedTypeDetails = typeDetailsArray[matchedTypeDetailsIndex];
	const isValidType = Boolean(matchedTypeDetails);
	const returnObj = {typeDetails, matchedTypeDetails, matchedTypeDetailsIndex, matchedTypeDetailsIndexes, typeDetailsArray, isValidType};
	return returnObj;
};
