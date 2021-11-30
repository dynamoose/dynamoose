import { ModelOptions, ModelOptionsOptional } from ".";
export declare const original: ModelOptions;
declare const customObject: {
    set: (val: ModelOptionsOptional) => void;
    get: () => ModelOptionsOptional;
};
export { customObject as custom };
