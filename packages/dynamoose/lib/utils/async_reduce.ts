export default async function (array: any[], callbackfn: (previousValue: any, currentValue: any, currentIndex: number, array: any[]) => Promise<any>, initialValue: any): Promise<any> {
	const result = await array.reduce(async (a, b, c, d) => {
		const awaitedAccumulator = await a;
		return callbackfn(awaitedAccumulator, b, c, d);
	}, Promise.resolve(initialValue));

	return result;
}
