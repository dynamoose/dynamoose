const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/test', {useNewUrlParser: true});

// const Cat = mongoose.model('Cat', { name: String });
//
// const kitty = new Cat({ name: 'Zildjian' });
// kitty.save().then(() => console.log('meow'));

// mongoose.model();


const schema = new mongoose.Schema({"name": String});
const schemaB = new mongoose.Schema(schema);


console.log(schema);
console.log(schemaB);
