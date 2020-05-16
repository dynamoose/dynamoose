export class ConsoleProvider {
	log(message): void {
		let method: (message: string) => void;
		switch(message.level) {
		case "fatal":
		case "error":
			method = console.error;
			break;
		case "warn":
			method = console.warn;
			break;
		case "info":
			method = console.info;
			break;
		case "debug":
		case "trace":
			method = console.log;
			break;
		}

		method(message.category ? `${message.category} - ${message.message}` : message.message);
	}
}
