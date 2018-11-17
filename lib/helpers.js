function linkPromiseToCallback(promise, cb) {
  // If a callback exists, call it
  if(cb) promise.then(result => { cb(null, result); }, err => { cb(err); });
  // Either way, silence the promise error to maintain backwards compatibility.
  promise.catch(err => {});
  return promise;
}

module.exports = {
  linkPromiseToCallback,
}