import https from 'https';
import * as AWS from 'aws-sdk';
import debugBase from 'debug';
import Q from 'q';
import Table from './Table';
import Schema from './Schema';
import Model from './Model';
import VirtualType from './VirtualType';
import errors from './errors';

const debug = debugBase('dynamoose');
const debugTransaction = debugBase('dynamoose:transaction');

export type TAttributeToDynamo = (name: string, json: any, model: any, defaultFormatter: Function, options: ISchemaOptions) => any;
export type TAttributeFromDynamo = (name: string, json: any, defaultFormatter: Function) => any;
export interface ISchemaOptions {
  throughput?: number | string | {
    read: number;
    write: number;
  };
  useNativeBooleans?: boolean;
  useDocumentTypes?: boolean;
  timestamps?: boolean | {
    createdAt: string;
    updatedAt: string;
  };
  expires?: number | {
    ttl: number,
    attribute: string,
    returnExpiredItems: boolean,
    defaultExpires?: Function
  };
  saveUnknown?: boolean | Array<string>;
  errorUnknown?: boolean;
  attributeToDynamo?: TAttributeToDynamo;
  attributeFromDynamo?: TAttributeFromDynamo;
}
export interface IDynamooseOptions extends ISchemaOptions {
  create?: boolean;
  update?: boolean;
  waitForActive?: boolean;
  waitForActiveTimeout?: number;
  streamOptions?: {
    enabled?: boolean;
    type?: string;
  };
  prefix?: string;
  suffix?: string;
  serverSideEncryption?: boolean;
  defaultReturnValues?: string;
}
export interface ITransactionOptions {
  type?: string;
  returnRequest?: boolean;
}
export function createLocalDb (endpointURL: string) {
  const dynamoConfig = {};
  // This has to be done as the aws sdk types insist that new AWS.Endpoint(endpointURL) is not a string
  dynamoConfig['endpoint'] = new AWS.Endpoint(endpointURL);
  return new AWS.DynamoDB(dynamoConfig);
}
export function getModelSchemaFromIndex (item: any, dynamoose: Dynamoose) {
  const requestItem = item;
  const [requestItemProperty] = Object.keys(item);
  const tableName = requestItem[requestItemProperty].TableName;
  const TheModel = dynamoose.models[tableName];
  if (!TheModel) {
    const errorMessage = `${tableName} is not a registered model. You can only use registered Dynamoose models when using a RAW transaction object.`;
    throw new errors.TransactionError(errorMessage);
  }
  const TheModel$ = TheModel.$__;
  const {schema} = TheModel$;

  return {TheModel, TheModel$, schema};
}

/**
 * @class Dynamoose
 * The main export of dyanmoose, this class houses all of the model, table, and config
 * functionality. All calls to any submodule occur through this class.
 */
class Dynamoose {
  models: any;
  defaults: any;
  VirtualType: Function;
  AWS: any;
  endpointURL: string;
  dynamoDB: AWS.DynamoDB;
  dynamoDocumentClient: AWS.DynamoDB.DocumentClient;
  Schema: any;
  Table: any;
  Dynamoose: any;
  /**
   * @constructor
   * This set's our default options, initializes our models object, and adds these methods:
   *    VirtualType
   *    AWS
   *    Schema
   *    Table
   *    Dynamoose
   *
   * These are the externally availbale modules.
   */
  constructor() {
    this.models = {};
    this.defaults = {
      'create': true,
      'waitForActive': true, // Wait for table to be created
      'waitForActiveTimeout': 180000, // 3 minutes
      'prefix': '', // prefix_Table
      'suffix': '' // Table_suffix
    };
    this.VirtualType = VirtualType;
    this.AWS = AWS;
    this.Schema = Schema;
    this.Table = Table;
    this.Dynamoose = this;
  }
  /**
   * This method adds a new model or returns the existing one if not unique.
   * @param name The chosen name for your model
   * @param schema The defined Schema
   * @param options The supported set of Dynamoose and Schema options
   * @returns an instance of your started Model
   */
  model(name: string, schema: any, options?: IDynamooseOptions) {
    options = options || {};

    for (const key in this.defaults) {
      options[key] = typeof options[key] === 'undefined' ? this.defaults[key] : options[key];
    }

    name = options.prefix + name + options.suffix;

    debug('Looking up model %s', name);

    if (this.models[name]) {
      return this.models[name];
    }
    if (!(schema instanceof Schema)) {
      schema = new Schema(schema, options);
    }

    const model = Model.compile(name, schema, options, this);
    this.models[name] = model;
    return model;
  }
  /**
   * This methods sets up and attaches a local db instance
   * @param url the url to connect to locally
   */
  local (url?: string) {
    this.endpointURL = url || 'http://localhost:8000';
    this.dynamoDB = createLocalDb(this.endpointURL);
    debug('Setting DynamoDB to local (%s)', this.endpointURL);
  }
  /**
   * This method will initialize and then return the dynamoDocumentClient
   * @returns an instance of the AWS.DynamoDB.DocumentClient
   */
  documentClient () {
    if (this.dynamoDocumentClient) {
      return this.dynamoDocumentClient;
    }
    if (this.endpointURL) {
      debug('Setting dynamodb document client to %s', this.endpointURL);
      this.AWS.config.update({'endpoint': this.endpointURL});
    } else {
      debug('Getting default dynamodb document client');
    }
    this.dynamoDocumentClient = new this.AWS.DynamoDB.DocumentClient();
    return this.dynamoDocumentClient;
  }
  /**
   * This method allows you to ovveride the built AWS.DynamoDB.DocumentClient instance
   * @param documentClient your AWS.DynamoDB.DocumentClient instance
   */
  setDocumentClient(documentClient: AWS.DynamoDB.DocumentClient) {
    debug('Setting dynamodb document client');
    this.dynamoDocumentClient = documentClient;
  }
  /**
   * This method initializes and returns an AWS.DynamoDB instance
   * @returns an AWS.DynamoDB instance
   */
  ddb() {
    if (this.dynamoDB) {
      return this.dynamoDB;
    }

    if (this.endpointURL) {
      debug('Setting DynamoDB to %s', this.endpointURL);
      this.dynamoDB = createLocalDb(this.endpointURL);
    } else {
      debug('Getting default DynamoDB');
      this.dynamoDB = new this.AWS.DynamoDB({
        'httpOptions': {
          'agent': new https.Agent({
            'rejectUnauthorized': true,
            'keepAlive': true
          })
        }
      });
    }
    return this.dynamoDB;
  }
  /**
   * This method allows you to override the defaults defined at initialization of this instance
   * @param options the accepted options for Dynamoose or Schemas
   */
  setDefaults(options: IDynamooseOptions) {
    for (const key in this.defaults) {
      options[key] = typeof options[key] === 'undefined' ? this.defaults[key] : options[key];
    }

    this.defaults = options;
  }
  /**
   * This method allows you to override the default AWS.DynamoDB instance
   * @param ddb an instance of AWS.DynamoDB
   */
  setDDB(ddb: AWS.DynamoDB) {
    debug('Setting custom DDB');
    this.dynamoDB = ddb;
  }
  /**
   * This method allows you to clear the AWS.DynamoDB instance
   */
  revertDDB() {
    debug('Reverting to default DDB');
    this.dynamoDB = undefined;
  }
  /**
   * This method process an array of models as defined by the options and calls the callback when complete
   * @param items An array of Models to process
   * @param options Either a callback or the allowed option set
   * @param next A callback for post transaction completion
   */
  async transaction(items: Array<any>, options?: Function | ITransactionOptions, next?: Function) {
    debugTransaction('Run Transaction');
    const deferred = Q.defer();
    const dbClient = this.documentClient();
    const DynamoDBSet = dbClient.createSet([1, 2, 3]).constructor;
    const that = this;

    let builtOptions: any = options || {};
    if (typeof options === 'function') {
      next = options;
      builtOptions = {};
    }

    if (!Array.isArray(items) || items.length === 0) {
      deferred.reject(new errors.TransactionError('Items required to run transaction'));
      return deferred.promise.nodeify(next);
    }

    const tmpItems = await Promise.all(items);
    items = tmpItems;
    const transactionReq = {
      'TransactItems': items
    };
    let transactionMethodName;
    if (builtOptions.type) {
      debugTransaction('Using custom transaction method');
      if (builtOptions.type === 'get') {
        transactionMethodName = 'transactGetItems';
      } else if (builtOptions.type === 'write') {
        transactionMethodName = 'transactWriteItems';
      } else {
        deferred.reject(new errors.TransactionError('Invalid type option, please pass in "get" or "write"'));
        return deferred.promise.nodeify(next);
      }
    } else {
      debugTransaction('Using predetermined transaction method');
      transactionMethodName = items.map((obj) => Object.keys(obj)[0]).every((key) => key === 'Get') ? 'transactGetItems' : 'transactWriteItems';
    }
    debugTransaction(`Using transaction method: ${transactionMethodName}`);

    const transact = () => {
      debugTransaction('transact', transactionReq);
      this.dynamoDB[transactionMethodName](transactionReq, async (err, data) => {
        if (err) {
          debugTransaction(`Error returned by ${transactionMethodName}`, err);
          return deferred.reject(err);
        }

        debugTransaction(`${transactionMethodName} response`, data);

        if (!data.Responses) {
          return deferred.resolve();
        }

        return deferred.resolve((await Promise.all(data.Responses.map(async (item, index) => {
          const {TheModel, schema} = getModelSchemaFromIndex(items[index], this);
          Object.keys(item).forEach((prop) => {
            if (item[prop] instanceof DynamoDBSet) {
              item[prop] = item[prop].values;
            }
          });

          const model = new TheModel();
          model.$__.isNew = false;
          // Destruct 'item' DynamoDB's returned structure.
          await schema.parseDynamo(model, item.Item);
          debugTransaction(`${transactionMethodName} parsed model`, model);
          return model;
        }))).filter((item, index) => {
          const {schema} = getModelSchemaFromIndex(items[index], this);

          return !(schema.expires && schema.expires.returnExpiredItems === false && item[schema.expires.attribute] && item[schema.expires.attribute] < new Date());
        }));
      });
    };

    if (builtOptions.returnRequest) {
      deferred.resolve(transactionReq);
    } else if (items.some((item, index) => getModelSchemaFromIndex(items[index], this).TheModel.$__.table.options.waitForActive)) {
      const waitForActivePromises = Promise.all(items.filter((item, index) => getModelSchemaFromIndex(items[index], this).TheModel.$__.table.options.waitForActive).map((item, index) => getModelSchemaFromIndex(items[index], this).TheModel.$__.table.waitForActive()));
      waitForActivePromises.then(transact).catch(deferred.reject);
    } else {
      transact();
    }
    return deferred.promise.nodeify(next);
  }
}

const DynamooseInstance = new Dynamoose();

export default DynamooseInstance;
