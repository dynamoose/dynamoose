export default function (key: string): string {
	const parts = key.split(".");
	return parts[parts.length - 1];
}
