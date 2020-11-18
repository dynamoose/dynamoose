import {Document} from "./Document";
import {DocumentArray, CallbackType} from "./General";
import utils = require("./utils");
import {AWSError} from "aws-sdk";
import {DynamoDBTypeResult, DynamoDBSetTypeResult, Schema} from "./Schema";

export interface PopulateSettings {
	properties?: string[] | string | boolean;
}

interface PopulateInternalSettings {
	parentKey?: string;
}

export function PopulateDocument (this: Document): Promise<Document>;
export function PopulateDocument (this: Document, callback: CallbackType<Document, AWSError>): void;
export function PopulateDocument (this: Document, settings: PopulateSettings): Promise<Document>;
export function PopulateDocument (this: Document, settings: PopulateSettings, callback: CallbackType<Document, AWSError>): void;
export function PopulateDocument (this: Document, settings: PopulateSettings, callback: CallbackType<Document, AWSError> | null, internalSettings?: PopulateInternalSettings): void;
export function PopulateDocument (this: Document, settings?: PopulateSettings | CallbackType<Document, AWSError>, callback?: CallbackType<Document, AWSError> | null, internalSettings?: PopulateInternalSettings): Promise<Document> | void {
	if (typeof settings === "function") {
		callback = settings;
		settings = {};
	}
	if (!internalSettings) {
		internalSettings = {};
	}

	const {model} = this;
	const localSettings = settings;
	const promise = model.schemaForObject(this).then((schema) => {
		const modelAttributes: any[] = utils.array_flatten(schema.attributes().map((prop) => ({prop, "details": schema.getAttributeTypeDetails(prop)}))).filter((obj) => Array.isArray(obj.details) ? obj.details.some((detail) => detail.name === "Model") : obj.details.name === "Model").map((obj) => obj.prop);

		return {schema, modelAttributes};
	}).then((obj: {schema: Schema; modelAttributes: any[]}) => {
		const {schema, modelAttributes} = obj;

		return Promise.all(modelAttributes.map(async (prop) => {
			const typeDetails = schema.getAttributeTypeDetails(prop);
			const typeDetail: DynamoDBTypeResult | DynamoDBSetTypeResult = Array.isArray(typeDetails) ? (typeDetails as any).find((detail) => detail.name === "Model") : typeDetails;
			const {typeSettings} = typeDetail;
			// TODO: `subModel` is currently any, we should fix that
			const subModel = typeof typeSettings.model === "object" ? model.Document as any : typeSettings.model;

			const doesPopulatePropertyExist = !(typeof this[prop] === "undefined" || this[prop] === null);
			if (!doesPopulatePropertyExist || this[prop] instanceof subModel) {
				return;
			}
			const key: string = [internalSettings.parentKey, prop].filter((a) => Boolean(a)).join(".");
			const populatePropertiesExists: boolean = typeof localSettings?.properties !== "undefined" && localSettings.properties !== null;
			const populateProperties: boolean | string[] = Array.isArray(localSettings?.properties) || typeof localSettings?.properties === "boolean" ? localSettings.properties : [localSettings?.properties];
			const isPopulatePropertyInSettingProperties: boolean = populatePropertiesExists ? utils.dynamoose.wildcard_allowed_check(populateProperties, key) : true;
			if (!isPopulatePropertyInSettingProperties) {
				return;
			}

			const subDocument = await subModel.get(this[prop]);
			const saveDocument: Document = await PopulateDocument.bind(subDocument)(localSettings, null, {"parentKey": key});
			this[prop] = saveDocument;
		}));
	});

	if (callback) {
		promise.then(() => callback(null, this)).catch((err) => callback(err));
	} else {
		return (async (): Promise<Document> => {
			await promise;
			return this;
		})();
	}
}

export function PopulateDocuments (this: DocumentArray<Document>): Promise<DocumentArray<Document>>;
export function PopulateDocuments (this: DocumentArray<Document>, callback: CallbackType<DocumentArray<Document>, AWSError>): void;
export function PopulateDocuments (this: DocumentArray<Document>, settings: PopulateSettings): Promise<DocumentArray<Document>>;
export function PopulateDocuments (this: DocumentArray<Document>, settings: PopulateSettings, callback: CallbackType<DocumentArray<Document>, AWSError>): void;
export function PopulateDocuments (this: DocumentArray<Document>, settings?: PopulateSettings | CallbackType<DocumentArray<Document>, AWSError>, callback?: CallbackType<DocumentArray<Document>, AWSError>): Promise<DocumentArray<Document>> | void {
	if (typeof settings === "function") {
		callback = settings;
		settings = {};
	}

	const promise = Promise.all(this.map(async (document, index) => {
		this[index] = await PopulateDocument.bind(document)(settings);
	}));

	if (callback) {
		promise.then(() => callback(null, this)).catch((err) => callback(err));
	} else {
		return (async (): Promise<DocumentArray<Document>> => {
			await promise;
			return this;
		})();
	}
}
