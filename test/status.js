var expect = require("chai").expect,
    status = require("../commands/status");

describe("iotutil commands", function() {
  describe("Show status", function() {
      it("show meshblu status json", function() {
          var json = status.commandStatus();
          expect(json).to.equal("a");
      });
  });
});
