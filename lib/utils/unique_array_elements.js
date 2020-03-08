module.exports = (array) => array.filter((value, index, self) => self.indexOf(value) === index);
