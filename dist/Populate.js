"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopulateItems = exports.PopulateItem = void 0;
const utils = require("./utils");
const Internal = require("./Internal");
const { internalProperties } = Internal.General;
function PopulateItem(settings, callback, internalSettings) {
    if (typeof settings === "function") {
        callback = settings;
        settings = {};
    }
    if (!internalSettings) {
        internalSettings = {};
    }
    const { model } = this;
    const localSettings = settings;
    const promise = model[internalProperties].schemaForObject(this).then((schema) => {
        // TODO: uncomment out `/* || detail.name === "Model Set"*/` part and add relevant tests
        const modelAttributes = utils.array_flatten(schema.attributes().map((prop) => ({ prop, "details": schema.getAttributeTypeDetails(prop) }))).filter((obj) => Array.isArray(obj.details) ? obj.details.some((detail) => detail.name === "Model" /* || detail.name === "Model Set"*/) : obj.details.name === "Model" || obj.details.name === "Model Set").map((obj) => obj.prop);
        return { schema, modelAttributes };
    }).then((obj) => {
        const { schema, modelAttributes } = obj;
        return Promise.all(modelAttributes.map(async (prop) => {
            const typeDetails = schema.getAttributeTypeDetails(prop);
            const typeDetail = Array.isArray(typeDetails) ? typeDetails.find((detail) => detail.name === "Model") : typeDetails;
            const { typeSettings } = typeDetail;
            // TODO: `subModel` is currently any, we should fix that
            const subModel = typeof typeSettings.model === "object" ? model.Item : typeSettings.model;
            prop = prop.endsWith(".0") ? prop.substring(0, prop.length - 2) : prop;
            const itemPropValue = utils.object.get(this, prop);
            const doesPopulatePropertyExist = !(typeof itemPropValue === "undefined" || itemPropValue === null);
            if (!doesPopulatePropertyExist || itemPropValue instanceof subModel) {
                return;
            }
            const key = [internalSettings.parentKey, prop].filter((a) => Boolean(a)).join(".");
            const populatePropertiesExists = typeof (localSettings === null || localSettings === void 0 ? void 0 : localSettings.properties) !== "undefined" && localSettings.properties !== null;
            const populateProperties = Array.isArray(localSettings === null || localSettings === void 0 ? void 0 : localSettings.properties) || typeof (localSettings === null || localSettings === void 0 ? void 0 : localSettings.properties) === "boolean" ? localSettings.properties : [localSettings === null || localSettings === void 0 ? void 0 : localSettings.properties];
            const isPopulatePropertyInSettingProperties = populatePropertiesExists ? utils.dynamoose.wildcard_allowed_check(populateProperties, key) : true;
            if (!isPopulatePropertyInSettingProperties) {
                return;
            }
            const isArray = Array.isArray(itemPropValue);
            const isSet = itemPropValue instanceof Set;
            if (isArray || isSet) {
                const subItems = await Promise.all([...itemPropValue].map((val) => subModel.get(val)));
                const saveItems = await Promise.all(subItems.map((doc) => PopulateItem.bind(doc)(localSettings, null, { "parentKey": key })));
                utils.object.set(this, prop, saveItems);
            }
            else {
                const subItem = await subModel.get(itemPropValue);
                const saveItem = await PopulateItem.bind(subItem)(localSettings, null, { "parentKey": key });
                utils.object.set(this, prop, saveItem);
            }
        }));
    });
    if (callback) {
        promise.then(() => callback(null, this)).catch((err) => callback(err));
    }
    else {
        return (async () => {
            await promise;
            return this;
        })();
    }
}
exports.PopulateItem = PopulateItem;
function PopulateItems(settings, callback) {
    if (typeof settings === "function") {
        callback = settings;
        settings = {};
    }
    const promise = Promise.all(this.map(async (item, index) => {
        this[index] = await PopulateItem.bind(item)(settings);
    }));
    if (callback) {
        promise.then(() => callback(null, this)).catch((err) => callback(err));
    }
    else {
        return (async () => {
            await promise;
            return this;
        })();
    }
}
exports.PopulateItems = PopulateItems;
