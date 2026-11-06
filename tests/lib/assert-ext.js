'use strict';
const assert = require('node:assert/strict');
let count = 0;
function test(name, fn) {
  try { fn(); count++; } catch (e) { e.message = name + ' → ' + e.message; throw e; }
}
function done(label) { console.log(count + ' vérifications OK · ' + label); }
module.exports = { assert, test, done };
