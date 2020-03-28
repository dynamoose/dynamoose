const entries = require("./entries");

module.exports = (object, existingKey = "") => entries(object, existingKey).map((a) => a[0]);
