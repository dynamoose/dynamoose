import obj from "./object";

export = <T>(array: T[]): T[] => array.filter((value, index, self) => self.findIndex((searchVal) => obj.equals(searchVal, value)) === index);
