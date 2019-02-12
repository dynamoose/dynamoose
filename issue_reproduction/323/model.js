const {
  initialize
} = require('./index');
const shortId = require('shortid');

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

  try {
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
  } catch(e) {
    console.log(e);
  }
};

buildModel();
