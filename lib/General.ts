export type CallbackType<R, E> = (error?: E | null, response?: R) => void;
export type ObjectType = {[key: string]: any};
export type FunctionType = (...args: any[]) => any;
