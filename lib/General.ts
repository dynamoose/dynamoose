import { Document } from "./Document";
import { Model } from "./Model";

// - General
export type CallbackType<R, E> = (error?: E | null, response?: R) => void;
export type ObjectType = {[key: string]: any};
export type FunctionType = (...args: any[]) => any;

// - Dynamoose
interface ModelDocumentConstructor<T extends Document> {
	new (object: {[key: string]: any}): T;
	Model: Model<T>;
}
export type ModelType<T extends Document> = T & Model<T> & ModelDocumentConstructor<T>;

// This represents a document array. This is used for the output of functions such as `scan`, `query`, and `batchGet`. These functions can extend this property to add additional properties or functions. However this represents the shared properties/functions for all document arrays.
export interface DocumentArray<T> extends Array<T> {
	populate: () => Promise<DocumentArray<T>>;
	toJSON: () => ObjectType;
}
