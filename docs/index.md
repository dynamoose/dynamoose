# Dynamoose

<script src="https://embed.runkit.com" data-element-id="simple-example"></script>
<div class="index-page">
  <div id="hero">
    <div id="download">
      <p id="hero-subtitle">
        A modelling tool for Amazon's <span>DynamoDB</span>.
        <br />
        Inspired by Mongoose.
      </p>
      <div id="code-box">
        <div id="code-box-top-corner">
          <i class="fas fa-circle"></i>
          <i class="fas fa-circle"></i>
          <i class="fas fa-circle"></i>
        </div>
        <div id="code-box-command">
          <span id="prompt">$</span>
          <p>
            <span id="prompt">npm</span> install
            <span id="npmname">dynamoose</span> --save
          </p>
        </div>
      </div>
    </div>
    <a href="examples/about/" id="get-started">
      Get started
      <i style="padding: 0 0 0 10px;" class="fas fa-arrow-right"></i>
    </a>
  </div>
  <div id="example">
    <p id="section-title">Let's get up to speed</p>
    <p id="section-subtitle">Here's how it works:</p>
    <div class="eg-container">
      <p class="eg-title">Set AWS configurations in environment variables:</p>
      <pre>
              <code id="bash-code" class="bash">
  export AWS_ACCESS_KEY_ID = "Your AWS Access Key ID"
  export AWS_SECRET_ACCESS_KEY = "Your AWS Secret Access Key"
  export AWS_REGION = "us-east-1"
              </code>
              </pre>
    </div>
    <p id="section-title">Let's see it in action!</p>
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
  </div>
</div>
