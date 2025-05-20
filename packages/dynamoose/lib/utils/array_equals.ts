export default function array_equals<T>(a: T[], b: T[]): boolean {
	if (a === b) {
		return true;
	}
	if (a.length !== b.length) {
		return false;
	}
	
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) {
			return false;
		}
	}
	
	return true;
}