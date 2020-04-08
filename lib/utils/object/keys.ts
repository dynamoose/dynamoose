import entries from "./entries";

export = (object: object, existingKey = "") => entries(object, existingKey).map((a) => a[0]);
