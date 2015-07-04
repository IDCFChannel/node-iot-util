'use strict';

var request    = require('request'),
    sinon      = require('sinon'),
    should = require('chai').should(),
    fakeredis = require('fakeredis'),
    redis = require('redis');

var device;
var deviceCommand;

describe('device command', function() {
    before(function(done){
        sinon.stub(redis, 'createClient', fakeredis.createClient);
        var client = redis.createClient();
        device = require('../initializers/device')(client);
        deviceCommand = require('../commands/deviceCommand')(device);
        done();
    });

    after(function(done){
        redis.createClient.restore();
        done();
    });

    it('should list all devices', function(done) {
        var options = {};
        deviceCommand._list(device, options, function(err, res){
            console.log(res);
            done();
        });
    });
});

