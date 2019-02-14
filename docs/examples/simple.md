Below is a simple example of how to setup Dynamoose and get started quickly.

<script src="https://embed.runkit.com" data-element-id="simple-example"></script>

<div id="simple-example" class="runkit-frame">
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
    dynamoose.local(); // This defaults to "http://localhost:8000"
}

const createAndGetCat = async () => {
    const Cat = dynamoose.model('Cat', {id: Number, name: String});
    const garfield = new Cat({id: 666, name: 'Garfield'});
    await garfield.save();
    const badCat = await Cat.get(666);
    return badCat;
}

const bootStrap = async () => {
    await startUpAndReturnDynamo();
    createDynamooseInstance();
    const badCat = await createAndGetCat();
    console.log('Never trust a smiling cat. - ' + badCat.name);
}

bootStrap();
</div>
