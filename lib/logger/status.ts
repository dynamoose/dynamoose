let status = true; // Indicated if log events are being emitted to log providers or not

export = {
	"pause": (): void => {
		status = false;
	},
	"resume": (): void => {
		status = true;
	},
	"status": (): "active" | "paused" => {
		return status ? "active" : "paused";
	}
};
