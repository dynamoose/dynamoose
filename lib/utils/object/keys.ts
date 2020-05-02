import entries = require("./entries");
import {GeneralObject} from "./types";

export = <T>(object: GeneralObject<T>, existingKey = ""): string[] => entries(object, existingKey).map((a) => a[0]);
