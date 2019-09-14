const dynamoose = require("../lib");
const dynamooseOld = require("dynamoose");

// const Cat = dynamoose.model("Cat", { "name": String });

// const kitty = new Cat({ name: 'Zildjian' });
// kitty.save().then(() => console.log('meow'));

const modelA = dynamooseOld.model("Cat", {"name": String});
const modelB = new dynamooseOld.model("CatB", {"name": String});
