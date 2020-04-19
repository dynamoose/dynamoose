const core = require("@actions/core");
const package = require("../../package.json");
const version = package.version;
const {main, tag, tagNumber} = require("./retrieve")(version);

core.setOutput("main", main);
core.setOutput("tag", tag);
core.setOutput("tagNumber", tagNumber);

console.log({main, tag, tagNumber});