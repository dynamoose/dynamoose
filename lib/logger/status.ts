let status: boolean = true; // Indicated if log events are being emitted to log providers or not

export = {
	"pause": () => {
		status = false;
	},
	"resume": () => {
		status = true;
	},
	"status": (): "active" | "paused" => {
		return status ? "active" : "paused";
	}
};
