import * as obj from "js-object-utilities";

export default <T>(array: T[]): T[] => array.filter((value, index, self) => self.findIndex((searchVal) => obj.equals(searchVal, value)) === index);
