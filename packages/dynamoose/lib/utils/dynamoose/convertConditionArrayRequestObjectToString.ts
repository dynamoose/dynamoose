const convertConditionArrayRequestObjectToString = (expression: any[]): string => {
	return expression.reduce((result: string, item) => {
		const returnItem = [result];
		returnItem.push(Array.isArray(item) ? `(${convertConditionArrayRequestObjectToString(item)})` : item);

		return returnItem.filter((a) => a).join(" ");
	}, "");
};

export = convertConditionArrayRequestObjectToString;
