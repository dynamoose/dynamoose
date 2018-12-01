
var regexFuncName = /^Function ([^(]+)\(/i;


console.log('typeof Object: ' + typeof Object);
console.log('Object.constructor.name: ' + Object.constructor.name);
console.log('Object function name: "' + Object.toString().match(regexFuncName)[1] + '"');
console.log('\n');

console.log('typeof String: ' + typeof String);
console.log('String.constructor.name: ' + String.constructor.name);
console.log('String function name: "' + String.toString().match(regexFuncName)[1] + '"');
console.log('\n');


console.log('typeof [String]: ' + typeof [String]);
console.log('[String].constructor.name: ' + [String].constructor.name);
console.log('[String] function name: "' + [String].toString().match(regexFuncName)[1] + '"');
console.log('\n');



console.log('typeof Date: ' + typeof Date);
console.log('Date.constructor.name: ' + Date.constructor.name);
console.log('Date function name: "' + Date.toString().match(regexFuncName)[1] + '"');
console.log('\n');


console.log('typeof Number: ' + typeof Number);
console.log('Number.constructor.name: ' + Number.constructor.name);
console.log('Number function name: "' + Number.toString().match(regexFuncName)[1] + '"');
console.log('\n');


console.log('typeof Boolean: ' + typeof Boolean);
console.log('Boolean.constructor.name: ' + Boolean.constructor.name);
console.log('Boolean function name: "' + Boolean.toString().match(regexFuncName)[1] + '"');
console.log('\n');


console.log('typeof Array: ' + typeof Array);
console.log('Array.constructor.name: ' + Array.constructor.name);
console.log('Array function name: "' + Array.toString().match(regexFuncName)[1] + '"');
console.log('\n');


console.log('typeof Buffer: ' + typeof Buffer);
console.log('Buffer.constructor.name: ' + Buffer.constructor.name);
console.log('Buffer function name: "' + Buffer.toString().match(regexFuncName)[1] + '"');
console.log('\n');


console.log('typeof {}: ' + typeof {});
console.log('{}.constructor.name: ' + {}.constructor.name);
console.log('{}.toString(): ' + {}.toString());
console.log('\n');

console.log('typeof []: ' + typeof []);
console.log('[].constructor.name: ' + [].constructor.name);
console.log('[].toString(): ' + [].toString());
console.log('\n');
console.log('typeof \'\': ' + typeof '');
console.log('\'\'.constructor.name: ' + ''.constructor.name);
console.log('\'\'.toString(): ' + ''.toString());
console.log('\n');

console.log('typeof /regex/: ' + typeof /regex/);
console.log('/regex/.constructor.name: ' + /regex/.constructor.name);
console.log('\n');console.log('/regex/.toString(): ' + /regex/.toString());
