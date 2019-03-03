Below is a simple example of how to use DynamoDB TTL (time to live) with Dynamoose.

<script src="https://embed.runkit.com" data-element-id="ttl-example"></script>

<div id="ttl-example" class="runkit-frame">
const dynamoose = require('dynamoose');
const dynalite = require('dynalite');

const startUpAndReturnDynamo = async () => {
  const dynaliteServer = dynalite();
  await dynaliteServer.listen(8000);
  return dynaliteServer;
};

const createDynamooseInstance = () => {
    dynamoose.AWS.config.update({
      accessKeyId: 'AKID',
      secretAccessKey: 'SECRET',
      region: 'us-east-1'
    });
    dynamoose.setDefaults({
      prefix: 'example-',
      suffix: ''
    });
    dynamoose.local(); // This defaults to "http://localhost:8000"
}

const createAndGetCat = async () => {
    const expiresConfig = {
      expires: {
        // ttl (time to live) set in seconds
        ttl: 1 * 24 * 60 * 60,
        // This is the name of our attribute to be stored in DynamoDB
        attribute: 'ttl'
      }
    }
    const Cat = dynamoose.model('Cat', {id: Number, name: String}, expiresConfig);
    const garfield = new Cat({id: 420, name: 'Fluffy'});
    await garfield.save();
    const soonToBeCat = await Cat.get(420);
    return soonToBeCat;
}

const bootStrap = async () => {
    await startUpAndReturnDynamo();
    createDynamooseInstance();
    const soonToBeCat = await createAndGetCat();
    console.log(JSON.stringify(soonToBeCat, null, 2));
}

bootStrap();
</div>
