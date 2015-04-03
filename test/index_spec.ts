import chai = require("chai");
import index = require("../src/index");

var assert = chai.assert;

describe("index", () => {
    it("should be true", () => {
        assert.isTrue(index.test);
    });
});
