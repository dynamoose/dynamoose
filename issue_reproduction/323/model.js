const shortId = require('shortid');
const dynamoose = require('../../lib');
const dynalite = require('dynalite');

let serverRef;

const startUpAndReturnDynamo = async () => {
  const dynaliteServer = dynalite();
  await dynaliteServer.listen(8000);
  serverRef = dynaliteServer;
};

const createDynamooseInstance = () => {
  dynamoose.AWS.config.update({
    accessKeyId: 'AKID',
    secretAccessKey: 'SECRET',
    region: 'us-east-1'
  });
  dynamoose.local(); // This defaults to "http://localhost:8000"
  return dynamoose;
};

const initialize = async () => {
  await startUpAndReturnDynamo();
  return createDynamooseInstance();
};

const buildModel = async () => {
  let dynamooseRef = await initialize();
  const Schema = dynamooseRef.Schema;
  const schema = new Schema({
    adUrlId: {
      type: String,
      rangeKey: true,
      default: shortId.generate
    },
    customerId:{
      type: String,
      required: true,
      hashKey: true
    },
    userId: {
      type: String,
      required: true
    },
    title : {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    desktop: Map,
    mobile: Map,
    app: Map,
    campaignId: {
      type: String,
      required: true,
      index: {
        global: true,
        rangeKey: 'customerId'
      }
    }
  });

  const Model = dynamooseRef.model('AdUrl', schema, {
    update: true,
    timestamps: true,
    useDocumentTypes: true,
    saveUnknown: ['mobile'],
    throughput: {
      read: 1,
      write: 1
    }
  });

  const adUrlModel = new Model({
    title: '123',
    type: 'cats',
    userId: 123,
    customerId: 123,
    campaignId: 123,
    mobile: {
      '123' : '123'
    }
  });
  const results = await adUrlModel.save();
  console.log(JSON.stringify(results, null, 2));
  await Model.create({
    title: '1234',
    type: 'cats4',
    userId: 1234,
    customerId: 1234,
    campaignId: 1234,
    mobile: {
      '1234' : '1234'
    }
  });
  let allModels = await Model.scan({}).exec();
  console.log(JSON.stringify(allModels, null, 2));
  await serverRef.close();
};

buildModel();
