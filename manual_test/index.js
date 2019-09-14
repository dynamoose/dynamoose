const dynamoose = require("../lib");

const Cat = dynamoose.model("Cat", { "name": String });

// const kitty = new Cat({ name: 'Zildjian' });
// kitty.save().then(() => console.log('meow'));
