// Custom made dynamoose declaration file.
import * as _AWS from 'aws-sdk';

declare module "dynamoose" {
  export var AWS: typeof _AWS;

  export function local(url?: string): void;
  export function ddb(): _AWS.DynamoDB;
  export function setDocumentClient(documentClient: _AWS.DynamoDB.DocumentClient): void;

  export function model<DataSchema, KeySchema>(
    modelName: string,
    schema: Schema | SchemaAttributes,
    options?: ModelOption
  ): ModelConstructor<DataSchema, KeySchema>;
  export function setDefaults(options: ModelOption): void;
  export function setDDB(ddb: _AWS.DynamoDB): void;
  export function revertDDB(): void;
  export function transaction<DataSchema, KeySchema>(
    items: Array<
      Promise<ModelSchema<DataSchema>>
      | _AWS.DynamoDB.TransactWriteItem
      | _AWS.DynamoDB.TransactGetItem
    >,
    options?: TransactionOptions,
    next?: (err: Error, data: TransactionReturnData<DataSchema>) => void
  ): Promise<TransactionReturnData<DataSchema>>
  export interface TransactionReturnData<DataSchema> {
    TransactItems: Array<ModelSchema<DataSchema>>
  }
  export interface TransactionOptions {
    type: 'get' | 'write'
  }

  export interface ModelOption {
    create?: boolean, // Create table in DB, if it does not exist,
    update?: boolean, // Update remote indexes if they do not match local index structure
    waitForActive?: boolean, // Wait for table to be created before trying to us it
    waitForActiveTimeout?: number, // wait 3 minutes for table to activate
    prefix?: string, // Set table name prefix
    suffix?: string, // Set table name suffix
    serverSideEncryption?: boolean, // Set SSESpecification.Enabled (server-side encryption) to true or false (default: true)
  }

  /**
  * Schema
  */
  export class Schema {
    constructor(schema: SchemaAttributes, options?: SchemaOptions);
    method(name: string, fn: any): any;
    parseDynamo(model: any, dynamoObj: any): any;
    static(name: string, fn: any): any;
    toDynamo(model: any): any;
    virtual(name: string, options: any): any;
    virtualpath(name: string): any;
  }


  export interface RawSchemaAttributeDefinition<Constructor, Type> {
    [key: string]: SchemaAttributeDefinition<Constructor, Type>
    | RawSchemaAttributeDefinition<Constructor, Type>;
  }
  export interface SchemaAttributeDefinition<Constructor, Type> {
    type: Constructor;
    validate?: (v: Type) => boolean | Promise<boolean>;
    hashKey?: boolean;
    rangeKey?: boolean;
    required?: boolean;
    get?: () => Type;
    set?: (v: Type) => void;
    trim?: boolean;
    lowercase?: boolean;
    uppercase?: boolean;
    /**
    * Indicating Secondary Index.
    * 'true' is means local, project all
    */
    index?: boolean | IndexDefinition | IndexDefinition[];
    default?: (() => Type) | Type
  }
  export interface SchemaOptions {
    throughput?: boolean | { read: number, write: number } | "ON_DEMAND";
    useNativeBooleans?: boolean;
    useDocumentTypes?: boolean;
    timestamps?: boolean | { createdAt: string, updatedAt: string };
    expires?: number | { ttl: number, attribute: string, returnExpiredItems: boolean };
    saveUnknown?: boolean;

    // @todo more strong type definition
    attributeToDynamo?: (name: string, json: any, model: any, defaultFormatter: any) => any;
    attributeFromDynamo?: (name: string, json: any, fallback: any) => any;
  }

  export interface SchemaAttributes {
    [key: string]: (
      SchemaAttributeDefinition<NumberConstructor, number>
      | SchemaAttributeDefinition<[NumberConstructor], number[]>
      | SchemaAttributeDefinition<DateConstructor, Date>
      | SchemaAttributeDefinition<StringConstructor, string>
      | SchemaAttributeDefinition<[StringConstructor], string[]>
      | SchemaAttributeDefinition<ObjectConstructor, Object>
      | SchemaAttributeDefinition<ArrayConstructor, Array<any>>
      | SchemaAttributeDefinition<any, any>
      | RawSchemaAttributeDefinition<any, any>
      | NumberConstructor
      | [NumberConstructor]
      | DateConstructor
      | StringConstructor
      | [StringConstructor]
      | ObjectConstructor
      | ArrayConstructor
    )
  }

  /**
  * Index
  */
  interface IndexDefinition {
    name?: string;
    global?: boolean;
    rangeKey?: string;
    project?: boolean | string[];
    throughput?: number | { read: number, write: number };
  }

  /**
  * Table
  */
  export class Table {
    constructor(name: string, schema: any, options: any, base: any);
    create(next: any): any;
    createIndex(attributes: any, indexSpec: any): any;
    delete(next: any): any;
    deleteIndex(indexname: string): any;
    describe(next: any): any;
    init(next: any): any;
    update(next: any): any;
    waitForActive(timeout: any, next: any): any;
    getTableReq(): any;
  }

  /**
  * Model
  */
  export class Model<ModelData> {
    constructor(obj: ModelData);
    put(options: PutOptions, callback: (err: Error) => void): Promise<Model<ModelData>>;
    save(options: SaveOptions, callback: (err: Error) => void): Promise<Model<ModelData>>;

    delete(callback?: (err: Error) => void): Promise<undefined>;

    put(callback: (err: Error) => void): Promise<Model<ModelData>>;
    put(options: ModelData, callback?: (err: Error) => void): Promise<Model<ModelData>>;

    save(callback?: (err: Error) => void): Promise<Model<ModelData>>;
    save(options: ModelData, callback?: (err: Error) => void): Promise<Model<ModelData>>;

    originalItem(): object;

    populate<T>(path: string | PopulateOptions): Promise<Model<ModelData> & T>
  }
  type PopulateOptions = { path: string, model: string, populate?: PopulateOptions }

  export interface PutOptions {
    /**
    * Overwrite existing item. Defaults to true for `model.put` and false for `Model.create`.
    */
    overwrite?: boolean;
    /**
    * Whether to update the documents timestamps or not. Defaults to true.
    */
    updateTimestamps?: boolean;
    /**
    * Whether to update the documents expires or not. Defaults to false.
    */
    updateExpires?: boolean;
    /**
    * An expression for a conditional update. See the AWS documentation for more information about condition expressions.
    */
    condition?: string;
    /**
    * A map of name substitutions for the condition expression.
    */
    conditionNames?: any;
    /**
    * A map of values for the condition expression. Note that in order for automatic object conversion to work, the keys in this object must match schema attribute names.
    */
    conditionValues?: any;
  }
  type SaveOptions = PutOptions;

  export interface ModelConstructor<DataSchema, KeySchema> {
    new(value?: DataSchema): ModelSchema<DataSchema>;
    (value?: DataSchema): ModelSchema<DataSchema>;
    readonly prototype: ModelSchema<DataSchema>;

    batchPut(items: DataSchema[], options?: PutOptions, callback?: (err: Error, items: ModelSchema<DataSchema>[]) => void): Promise<ModelSchema<DataSchema>[]>;
    batchPut(items: DataSchema[], callback?: (err: Error, items: ModelSchema<DataSchema>[]) => void): Promise<ModelSchema<DataSchema>[]>;

    create(item: DataSchema, options?: PutOptions, callback?: (err: Error, model: ModelSchema<DataSchema>) => void): Promise<ModelSchema<DataSchema>>;
    create(item: DataSchema, callback?: (err: Error, model: ModelSchema<DataSchema>) => void): Promise<ModelSchema<DataSchema>>;
    create(item: DataSchema, options?: PutOptions): Promise<ModelSchema<DataSchema>>;

    get(key: KeySchema, callback?: (err: Error, data: DataSchema) => void): Promise<ModelSchema<DataSchema> | undefined>;
    batchGet(key: KeySchema[], callback?: (err: Error, data: DataSchema) => void): Promise<ModelSchema<DataSchema>[]>;

    delete(key: KeySchema, callback?: (err: Error) => void): Promise<undefined>;
    batchDelete(keys: KeySchema[], callback?: (err: Error) => void): Promise<undefined>;

    query(query: QueryFilter, callback?: (err: Error, results: ModelSchema<DataSchema>[]) => void): QueryInterface<ModelSchema<DataSchema>, QueryResult<ModelSchema<DataSchema>>>;
    queryOne(query: QueryFilter, callback?: (err: Error, results: ModelSchema<DataSchema>) => void): QueryInterface<ModelSchema<DataSchema>, ModelSchema<DataSchema>>;
    scan(filter?: ScanFilter, callback?: (err: Error, results: ModelSchema<DataSchema>[]) => void): ScanInterface<ModelSchema<DataSchema>>;

    update(key: KeySchema, update: UpdateUpdate<DataSchema>, options: UpdateOption, callback: (err: Error, items: ModelSchema<DataSchema>[]) => void): void;
    update(key: KeySchema, update: UpdateUpdate<DataSchema>, callback: (err: Error, items: ModelSchema<DataSchema>[]) => void): void;
    update(key: KeySchema, update: UpdateUpdate<DataSchema>, options?: UpdateOption): Promise<ModelSchema<DataSchema>>;

    transaction: ModelTransactionConstructor<DataSchema, KeySchema>
  }
  type ModelSchema<T> = Model<T> & T;

  /**
  * Update
  */

  /**
  * Updates and existing item in the table. Three types of updates: $PUT, $ADD, and $DELETE.
  * Put is the default behavior.
  */
  type UpdateUpdate<DataSchema> = (
    Partial<DataSchema>
    | { $PUT: Partial<DataSchema> }
    | { $ADD: Partial<DataSchema> }
    | { $DELETE: Partial<DataSchema> }
  );

  export interface UpdateOption {
    /**
    * If true, the attribute can be updated to an empty array. If false, empty arrays will remove the attribute. Defaults to false.
    */
    allowEmptyArray: boolean;
    /**
    * If true, required attributes will be filled with their default values on update (regardless of you specifying them for the update). Defaults to false.
    */
    createRequired: boolean;
    /**
    * If true, the timestamps attributes will be updated. Will not do anything if timestamps attribute were not specified. Defaults to true.
    */
    updateTimestamps: boolean;
  }


  /**
  * Query
  */
  type QueryFilter = any;
  export interface QueryInterface<T, R> {
    exec(callback?: (err: Error, result: R) => void): Promise<R>;
    where(rangeKey: string): QueryInterface<T, R>;
    filter(filter: string): QueryInterface<T, R>;
    and(): QueryInterface<T, R>;
    or(): QueryInterface<T, R>;
    not(): QueryInterface<T, R>;
    null(): QueryInterface<T, R>;
    eq(value: any): QueryInterface<T, R>;
    lt(value: any): QueryInterface<T, R>;
    le(value: any): QueryInterface<T, R>;
    ge(value: any): QueryInterface<T, R>;
    gt(value: any): QueryInterface<T, R>;
    beginsWith(value: string): QueryInterface<T, R>;
    between(valueA: any, valueB: any): QueryInterface<T, R>;
    contains(value: string): QueryInterface<T, R>;
    in(values: any[]): QueryInterface<T, R>;
    limit(limit: number): QueryInterface<T, R>;
    consistent(): QueryInterface<T, R>;
    descending(): QueryInterface<T, R>;
    ascending(): QueryInterface<T, R>;
    startAt(key: QueryKey): QueryInterface<T, R>;
    attributes(attributes: string[]): QueryInterface<T, R>;
    count(): QueryInterface<T, R>;
    counts(): QueryInterface<T, R>;
  }
  export interface QueryResult<T> extends Array<T> {
    lastKey?: QueryKey;
  }
  type QueryKey = any;


  /**
  * Scan
  */
  type ScanFilter = string | any;

  export interface ScanInterface<T> {
    exec(callback?: (err: Error, result: ScanResult<T>) => void): Promise<ScanResult<T>>;
    all(delay?: number, max?: number): ScanInterface<T>;
    parallel(totalSegments: number): ScanInterface<T>;
    using(indexName: string): ScanInterface<T>;
    consistent(filter?: any): ScanInterface<T>;
    where(filter: any): ScanInterface<T>;
    filter(filter: any): ScanInterface<T>;
    and(): ScanInterface<T>;
    not(): ScanInterface<T>;
    null(): ScanInterface<T>;
    eq(value: any): ScanInterface<T>;
    lt(value: any): ScanInterface<T>;
    le(value: any): ScanInterface<T>;
    ge(value: any): ScanInterface<T>;
    gt(value: any): ScanInterface<T>;
    beginsWith(value: any): ScanInterface<T>;
    between(valueA: any, valueB: any): ScanInterface<T>;
    contains(value: any): ScanInterface<T>;
    beginsWith(value: any): ScanInterface<T>;
    in(value: any): ScanInterface<T>;
    limit(limit: number): ScanInterface<T>;
    startAt(key: ScanKey): ScanInterface<T>;
    attributes(value: any): ScanInterface<T>;
    count(): ScanInterface<T>;
    counts(): ScanInterface<T>;
  }

  export interface ScanResult<ModelData> extends Array<ModelData> {
    lastKey?: ScanKey;
  }

  type ScanKey = any;

  export class VirtualType {
    constructor(options: any, name: string);
    applyVirtuals(model: any): void;
    get(fn: any): any;
    set(fn: any): any;
  }

  /**
   * Transaction
   */
  export interface ModelTransactionConstructor<DataSchema, KeySchema> {
    new(value?: DataSchema): ModelSchema<DataSchema>;
    (value?: DataSchema): ModelSchema<DataSchema>;
    readonly prototype: ModelSchema<DataSchema>;

    create(item: DataSchema, options?: PutOptions, callback?: (err: Error, model: ModelSchema<DataSchema>) => void): Promise<ModelSchema<DataSchema>>;
    create(item: DataSchema, callback?: (err: Error, model: ModelSchema<DataSchema>) => void): Promise<ModelSchema<DataSchema>>;
    create(item: DataSchema, options?: PutOptions): Promise<ModelSchema<DataSchema>>;

    get(key: KeySchema, callback?: (err: Error, data: DataSchema) => void): Promise<ModelSchema<DataSchema> | undefined>;

    delete(key: KeySchema, callback?: (err: Error) => void): Promise<undefined>;

    update(key: KeySchema, update: UpdateUpdate<DataSchema>, options: UpdateOption, callback: (err: Error, items: ModelSchema<DataSchema>[]) => void): void;
    update(key: KeySchema, update: UpdateUpdate<DataSchema>, callback: (err: Error, items: ModelSchema<DataSchema>[]) => void): void;
    update(key: KeySchema, update: UpdateUpdate<DataSchema>, options?: UpdateOption): Promise<ModelSchema<DataSchema>>;

    conditionCheck(key: KeySchema, options?: ConditionOptions): void
  }
  export interface ConditionOptions {
    condition: string,
    conditionNames: object,
    conditionValues: object,
  }
}
