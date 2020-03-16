module.exports = (saveUnknown, checkKey) => Array.isArray(saveUnknown) ? saveUnknown.includes(checkKey) : saveUnknown;
