import {Document} from "./Document";
import {Model} from "./Model";

export type CallbackType<R, E> = (error?: E | null, response?: R) => void;
export type ObjectType = {[key: string]: any};
export type FunctionType = (...args: any[]) => any;

interface ModelDocumentConstructor<T extends Document> {
	new (object: {[key: string]: any}): T;
}
export type ModelType<T extends Document> = T & Model<T> & ModelDocumentConstructor<T>;

export enum SortOrder {
	ascending = "ascending",
	descending = "descending"
}
