var expect = require("chai").expect,
    utils = require("../utils");

describe("pretty table", function() {
  describe("table a", function() {
      it("table a", function() {
          expect(utils.prettyTable()).to.equal("a");
      });
  });
});
