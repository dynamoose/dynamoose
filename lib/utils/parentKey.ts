export default function (key: string): string {
	return key.split(".").slice(0, -1).join(".");
}
