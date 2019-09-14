const dynamoose = require("../lib");
const dynamooseOld = require("dynamoose");

const Cat = dynamoose.model("Cat", { "name": String });

// console.log(Object.getPrototypeOf(Cat));
// Cat();
// console.log(Cat instanceof dynamoose.model);
// const kitty = new Cat({ name: 'Zildjian' });
// kitty.save().then(() => console.log('meow'));
