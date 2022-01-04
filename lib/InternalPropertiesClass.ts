import CustomError from "./Error";
import Internal from "./Internal";
const {internalProperties} = Internal.General;

export class InternalPropertiesClass<T> {
	#internalProperties: T;

	getInternalProperties (key: symbol): T {
		if (key !== internalProperties) {
			throw new CustomError.InvalidParameter("You can not access internal properties without a valid key.");
		} else {
			return this.#internalProperties;
		}
	}

	setInternalProperties (key: symbol, value: T): void {
		if (key !== internalProperties) {
			throw new CustomError.InvalidParameter("You can not set internal properties without a valid key.");
		} else {
			this.#internalProperties = value;
		}
	}
}
