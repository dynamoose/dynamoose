import entries from "./entries";
import {GeneralObject} from "./types";

export = <T>(object: GeneralObject<T>, existingKey = ""): string[] => entries(object, existingKey).map((a) => a[0]);
