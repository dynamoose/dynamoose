"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Serializer_serializers, _Serializer_defaultSerializer;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Serializer = void 0;
const CustomError = require("./Error");
const utils = require("./utils");
class Serializer {
    constructor() {
        _Serializer_serializers.set(this, void 0);
        _Serializer_defaultSerializer.set(this, void 0);
        this.default = {
            "set": (name) => {
                if (typeof name === "undefined" || name === null) {
                    name = Serializer.defaultName;
                }
                if (!name || typeof name !== "string") {
                    throw new CustomError.InvalidParameter("Field name is required and should be of type string");
                }
                if (Object.keys(__classPrivateFieldGet(this, _Serializer_serializers, "f")).includes(name)) {
                    __classPrivateFieldSet(this, _Serializer_defaultSerializer, name, "f");
                }
            }
        };
        __classPrivateFieldSet(this, _Serializer_serializers, {
            [Serializer.defaultName]: {
                "modify": (serialized, original) => (Object.assign({}, original))
            }
        }, "f");
        this.default.set();
    }
    add(name, options) {
        if (!name || typeof name !== "string") {
            throw new CustomError.InvalidParameter("Field name is required and should be of type string");
        }
        if (!options || !(Array.isArray(options) || typeof options === "object")) {
            throw new CustomError.InvalidParameter("Field options is required and should be an object or array");
        }
        __classPrivateFieldGet(this, _Serializer_serializers, "f")[name] = options;
    }
    delete(name) {
        if (!name || typeof name !== "string") {
            throw new CustomError.InvalidParameter("Field name is required and should be of type string");
        }
        if (name === Serializer.defaultName) {
            throw new CustomError.InvalidParameter("Can not delete primary default serializer");
        }
        // Removing serializer
        if (Object.keys(__classPrivateFieldGet(this, _Serializer_serializers, "f")).includes(name)) {
            delete __classPrivateFieldGet(this, _Serializer_serializers, "f")[name];
        }
        // Reset defaultSerializer to default if removing default serializer
        if (__classPrivateFieldGet(this, _Serializer_defaultSerializer, "f") === name) {
            this.default.set();
        }
    }
    _serializeMany(itemsArray, nameOrOptions) {
        if (!itemsArray || !Array.isArray(itemsArray)) {
            throw new CustomError.InvalidParameter("itemsArray must be an array of item objects");
        }
        return itemsArray.map((item) => {
            try {
                return item.serialize(nameOrOptions);
            }
            catch (e) {
                return this._serialize(item, nameOrOptions);
            }
        });
    }
    _serialize(item, nameOrOptions = __classPrivateFieldGet(this, _Serializer_defaultSerializer, "f")) {
        let options;
        if (typeof nameOrOptions === "string") {
            options = __classPrivateFieldGet(this, _Serializer_serializers, "f")[nameOrOptions];
        }
        else {
            options = nameOrOptions;
        }
        if (!options || !(Array.isArray(options) || typeof options === "object")) {
            throw new CustomError.InvalidParameter("Field options is required and should be an object or array");
        }
        if (Array.isArray(options)) {
            return utils.object.pick(item, options);
        }
        return [
            {
                "if": Boolean(options.include),
                "function": () => utils.object.pick(item, options.include)
            },
            {
                "if": Boolean(options.exclude),
                "function": (serialized) => utils.object.delete(serialized, options.exclude)
            },
            {
                "if": Boolean(options.modify),
                "function": (serialized) => options.modify(serialized, item)
            }
        ].filter((item) => item.if).reduce((serialized, item) => item.function(serialized), Object.assign({}, item));
    }
}
exports.Serializer = Serializer;
_Serializer_serializers = new WeakMap(), _Serializer_defaultSerializer = new WeakMap();
Serializer.defaultName = "_default";
