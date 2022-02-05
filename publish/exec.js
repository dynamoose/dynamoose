const {exec} = require("child_process");

module.exports = (cmd, obj) => {
	return new Promise((resolve, reject) => {
		if (obj) {
			exec(cmd, obj, (err, stdout, stderr) => {
				if (err) {
					reject(err);
				} else {
					resolve({"output": stdout, "error": stderr});
				}
			});
		} else {
			exec(cmd, (err, stdout, stderr) => {
				if (err) {
					reject(err);
				} else {
					resolve({"output": stdout, "error": stderr});
				}
			});
		}
	});
};
