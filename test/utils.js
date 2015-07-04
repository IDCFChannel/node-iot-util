'use strict';

var should = require('chai').should(),
    utils = require('../utils');

describe('utils', function() {
  describe('pretty table', function() {
      it('should create vertical tables', function() {
          var style = {
              head: [],
              border: []
          };

          var body = [
              {'token': 'dc098cc7'},
              {'uuid': '887688ad-bebd-4f5b-a559-88ecdbb5c1ec'}
          ];

          var expected = [
              '┌───────┬──────────────────────────────────────┐'
            , '│ token │ dc098cc7                             │'
            , '├───────┼──────────────────────────────────────┤'
            , '│ uuid  │ 887688ad-bebd-4f5b-a559-88ecdbb5c1ec │'
            , '└───────┴──────────────────────────────────────┘'
          ];

          utils.prettyTable(body, {style:style}).should.equal(expected.join('\n'));
      });

      it('should create single column', function() {
          var head = ['token', 'uuid'];
          var style = {
              head: [],
              border: []
          };
          var body = [
              ['dc098cc7', '887688ad-bebd-4f5b-a559-88ecdbb5c1ec']
          ];

          var expected = [
                '┌──────────┬──────────────────────────────────────┐'
              , '│ token    │ uuid                                 │'
              , '├──────────┼──────────────────────────────────────┤'
              , '│ dc098cc7 │ 887688ad-bebd-4f5b-a559-88ecdbb5c1ec │'
              , '└──────────┴──────────────────────────────────────┘'
          ];
          utils.prettyTable(body, {style: style, head: head}).should.equal(expected.join('\n'));
      });
  });
});
