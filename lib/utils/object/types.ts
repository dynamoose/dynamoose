export type GeneralObject<T> = { [key: string]: T };
export type GeneralObjectOrValue<T> = T | GeneralObject<T>;
