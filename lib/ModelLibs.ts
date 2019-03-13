import debugWrapper from "debug";
import errors from "./errors";
import Q from "q";
const debug = debugWrapper("dynamoose:model");

export function validKeyValue (value) {
  return value !== undefined && value !== null && value !== "";
}

export async function processCondition (req, options, model) {
  if (options.condition) {
    if (req.ConditionExpression) {
      req.ConditionExpression = `(${req.ConditionExpression}) and (${options.condition})`;
    } else {
      req.ConditionExpression = options.condition;
    }

    if (options.conditionNames) {
      req.ExpressionAttributeNames = {};
      for (const name in options.conditionNames) {
        req.ExpressionAttributeNames[`#${name}`] = options.conditionNames[name];
      }
    }
    if (options.conditionValues) {
      req.ExpressionAttributeValues = {};
      const keys = Object.keys(options.conditionValues);
      for (let i = 0; i < keys.length; i += 1) {
        const k = keys[i];

        const val = options.conditionValues[k];
        const attr = model.$__.schema.attributes[k];
        if (attr) {
          req.ExpressionAttributeValues[`:${k}`] = await attr.toDynamo(val, undefined, model, {"updateTimestamps": false});
        } else {
          throw new errors.ModelError(`Invalid condition value: ${k}. The name must either be in the schema or a full DynamoDB object must be specified.`);
        }
      }
    }
  }
}

  /*!
  * Register virtuals for this model
  * @param {Model} model
  * @param {Schema} schema
  */
export const applyVirtuals = function (model, schema) {
  debug("applying virtuals");
  for (const i in schema.virtuals) {
    schema.virtuals[i].applyVirtuals(model);
  }
};

  /*!
  * Register methods for this model
  *
  * @param {Model} model
  * @param {Schema} schema
  */
export const applyMethods = function (model, schema) {
  debug("applying methods");
  for (const i in schema.methods) {
    model.prototype[i] = schema.methods[i];
  }
};

  /*!
  * Register statics for this model
  * @param {Model} model
  * @param {Schema} schema
  */
export const applyStatics = function (model, schema) {
  debug("applying statics");
  for (const i in schema.statics) {
    model[i] = schema.statics[i].bind(model);
  }
};

export function sendErrorToCallback (error, options, next?) {
  if (typeof options === "function") {
    next = options;
  }
  if (typeof next === "function") {
    return next(error);
  }
}

export async function toBatchChunks (modelName, list, chunkSize, requestMaker) {
  const listClone = list.slice(0);
  let chunk = [];
  const batchChunks = [];

  while ((chunk = listClone.splice(0, chunkSize)).length) {
    const requests = await Promise.all(chunk.map(requestMaker));
    const batchReq = {
      "RequestItems": {}
    };

    batchReq.RequestItems[modelName] = requests;
    batchChunks.push(batchReq);
  }

  return batchChunks;
}

export function reduceBatchResult (resultList) {
  return resultList.reduce((acc, res) => {
    const responses = res.Responses ? res.Responses : {};
    const unprocessed = res.UnprocessedItems ? res.UnprocessedItems : {};

    // merge responses
    for (const tableName in responses) {
      if (Object.prototype.hasOwnProperty.call(responses, tableName)) {
        let consumed = acc.Responses[tableName] ? acc.Responses[tableName].ConsumedCapacityUnits : 0;
        consumed += responses[tableName].ConsumedCapacityUnits;

        acc.Responses[tableName] = {
          "ConsumedCapacityUnits": consumed
        };
      }
    }

    // merge unprocessed items
    for (const tableName2 in unprocessed) {
      if (Object.prototype.hasOwnProperty.call(unprocessed, tableName2)) {
        const items = acc.UnprocessedItems[tableName2] ? acc.UnprocessedItems[tableName2] : [];
        items.push(unprocessed[tableName2]);
        acc.UnprocessedItems[tableName2] = items;
      }
    }

    return acc;
  }, {"Responses": {}, "UnprocessedItems": {}});
}

export function batchWriteItems (NewModel, batchRequests) {
  debug("batchWriteItems");
  const newModel$ = NewModel.$__;
  const batchList = batchRequests.map((batchReq) => {
    const deferredBatch = Q.defer();

    newModel$.base.ddb().batchWriteItem(batchReq, (err, data) => {
      if (err) {
        debug("Error returned by batchWriteItems", err);
        return deferredBatch.reject(err);
      }

      deferredBatch.resolve(data);
    });

    return deferredBatch.promise;
  });

  return Q.all(batchList).then((resultList) => reduceBatchResult(resultList));
}