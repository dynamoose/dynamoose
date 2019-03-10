import https from "https";
import AWS from "aws-sdk";
import debugBase from "debug";
import Q from "q";
import Table from "./Table";
import Schema from "./Schema";
import Model from "./Model";
import VirtualType from "./VirtualType";
import errors from "./errors";

const debug = debugBase("dynamoose");
const debugTransaction = debugBase("dynamoose:transaction");

function createLocalDb (endpointURL: string) {
  const dynamoConfig = {};
  // This has to be done as the aws sdk types insist that new AWS.Endpoint(endpointURL) is not a string
  dynamoConfig["endpoint"] = new AWS.Endpoint(endpointURL);
  return new AWS.DynamoDB(dynamoConfig);
}

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

/**
 * The default export, basically a container for all of the innerworkings of dynamoose
 * This exports our Cofnig, Models, Schema, Table, and all other important functions
 */
function Dynamoose () {
  this.models = {};

  this.defaults = {
    "create": true,
    "waitForActive": true, // Wait for table to be created
    "waitForActiveTimeout": 180000, // 3 minutes
    "prefix": "", // prefix_Table
    "suffix": "" // Table_suffix
  }; // defaults
}

Dynamoose.prototype.model = function (name: string, schema: any, options?: IDynamooseOptions) {
  options = options || {};

  for (const key in this.defaults) {
    options[key] = typeof options[key] === "undefined" ? this.defaults[key] : options[key];
  }

  name = options.prefix + name + options.suffix;

  debug("Looking up model %s", name);

  if (this.models[name]) {
    return this.models[name];
  }
  if (!(schema instanceof Schema)) {
    schema = new Schema(schema, options);
  }

  const model = Model.compile(name, schema, options, this);
  this.models[name] = model;
  return model;
};

/**
 * The Mongoose [VirtualType](#virtualtype_VirtualType) constructor
 *
 * @method VirtualType
 * @api public
 */
Dynamoose.prototype.VirtualType = VirtualType;

Dynamoose.prototype.AWS = AWS;

Dynamoose.prototype.local = function (url?: string) {
  this.endpointURL = url || "http://localhost:8000";
  this.dynamoDB = createLocalDb(this.endpointURL);
  debug("Setting DynamoDB to local (%s)", this.endpointURL);
};

/**
 * Document client for executing nested scans
 */
Dynamoose.prototype.documentClient = function () {
  if (this.dynamoDocumentClient) {
    return this.dynamoDocumentClient;
  }
  if (this.endpointURL) {
    debug("Setting dynamodb document client to %s", this.endpointURL);
    this.AWS.config.update({"endpoint": this.endpointURL});
  } else {
    debug("Getting default dynamodb document client");
  }
  this.dynamoDocumentClient = new this.AWS.DynamoDB.DocumentClient();
  return this.dynamoDocumentClient;
};

Dynamoose.prototype.setDocumentClient = function (documentClient) {
  debug("Setting dynamodb document client");
  this.dynamoDocumentClient = documentClient;
};

Dynamoose.prototype.ddb = function () {
  if (this.dynamoDB) {
    return this.dynamoDB;
  }

  if (this.endpointURL) {
    debug("Setting DynamoDB to %s", this.endpointURL);
    this.dynamoDB = createLocalDb(this.endpointURL);
  } else {
    debug("Getting default DynamoDB");
    this.dynamoDB = new this.AWS.DynamoDB({
      "httpOptions": {
        "agent": new https.Agent({
          "rejectUnauthorized": true,
          "keepAlive": true
        })
      }
    });
  }
  return this.dynamoDB;
};

Dynamoose.prototype.setDefaults = function (options: IDynamooseOptions) {
  for (const key in this.defaults) {
    options[key] = typeof options[key] === "undefined" ? this.defaults[key] : options[key];
  }

  this.defaults = options;
};

Dynamoose.prototype.Schema = Schema;
Dynamoose.prototype.Table = Table;
Dynamoose.prototype.Dynamoose = Dynamoose;

Dynamoose.prototype.setDDB = function (ddb) {
  debug("Setting custom DDB");
  this.dynamoDB = ddb;
};
Dynamoose.prototype.revertDDB = function () {
  debug("Reverting to default DDB");
  this.dynamoDB = undefined;
};

Dynamoose.prototype.transaction = async function (items: Array<any>, options?: Function | any, next?: Function) {
  debugTransaction("Run Transaction");
  const deferred = Q.defer();
  const dbClient = this.documentClient();
  const DynamoDBSet = dbClient.createSet([1, 2, 3]).constructor;
  const that = this;


  options = options || {};
  if (typeof options === "function") {
    next = options;
    options = {};
  }

  if (!Array.isArray(items) || items.length === 0) {
    deferred.reject(new errors.TransactionError("Items required to run transaction"));
    return deferred.promise.nodeify(next);
  }

  const tmpItems = await Promise.all(items);
  items = tmpItems;
  const transactionReq = {
    "TransactItems": items
  };
  let transactionMethodName;
  if (options.type) {
    debugTransaction("Using custom transaction method");
    if (options.type === "get") {
      transactionMethodName = "transactGetItems";
    } else if (options.type === "write") {
      transactionMethodName = "transactWriteItems";
    } else {
      deferred.reject(new errors.TransactionError('Invalid type option, please pass in "get" or "write"'));
      return deferred.promise.nodeify(next);
    }
  } else {
    debugTransaction("Using predetermined transaction method");
    transactionMethodName = items.map((obj) => Object.keys(obj)[0]).every((key) => key === "Get") ? "transactGetItems" : "transactWriteItems";
  }
  debugTransaction(`Using transaction method: ${transactionMethodName}`);

  function getModelSchemaFromIndex (index: number) {
    const requestItem = items[index];
    const [requestItemProperty] = Object.keys(items[index]);
    const tableName = requestItem[requestItemProperty].TableName;
    const TheModel = that.models[tableName];
    if (!TheModel) {
      const errorMessage = `${tableName} is not a registered model. You can only use registered Dynamoose models when using a RAW transaction object.`;
      throw new errors.TransactionError(errorMessage);
    }
    const TheModel$ = TheModel.$__;
    const {schema} = TheModel$;

    return {TheModel, TheModel$, schema};
  }

  const transact = () => {
    debugTransaction("transact", transactionReq);
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
        const {TheModel, schema} = getModelSchemaFromIndex(index);
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
        const {schema} = getModelSchemaFromIndex(index);

        return !(schema.expires && schema.expires.returnExpiredItems === false && item[schema.expires.attribute] && item[schema.expires.attribute] < new Date());
      }));
    });
  };

  if (options.returnRequest) {
    deferred.resolve(transactionReq);
  } else if (items.some((item, index) => getModelSchemaFromIndex(index).TheModel.$__.table.options.waitForActive)) {
    const waitForActivePromises = Promise.all(items.filter((item, index) => getModelSchemaFromIndex(index).TheModel.$__.table.options.waitForActive).map((item, index) => getModelSchemaFromIndex(index).TheModel.$__.table.waitForActive()));
    waitForActivePromises.then(transact).catch(deferred.reject);
  } else {
    transact();
  }
  return deferred.promise.nodeify(next);
};

const DynamooseInstance = new Dynamoose();

export default DynamooseInstance;
