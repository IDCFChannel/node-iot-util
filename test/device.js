'use strict';

var request    = require('request'),
    sinon      = require('sinon'),
    should = require('chai').should(),
    fakeredis = require('fakeredis'),
    redis = require('redis');

var device;

describe('device initializer', function() {
    before(function(done){
        sinon.stub(redis, 'createClient', fakeredis.createClient);
        var client = redis.createClient();
        device = require('../initializers/device')(client);
        done();
    });

    after(function(done){
        redis.createClient.restore();
        done();
    });

    it('call redis keys', function(done) {
        var keyword = '';
        device.getDevices(keyword, function(err, res){
            should.exist(res);
            done();
        });
    });
});

