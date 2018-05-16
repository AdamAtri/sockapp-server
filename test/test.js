let assert = require('chai').assert;

describe('Array', function() {
  it ('should return -1 when searching for a non-existing element', function() {
    let fakeArray = [];
    let fakeElement = 9;
    let index = fakeArray.indexOf(fakeElement);
    assert.equal(index, -1);
  });
});
