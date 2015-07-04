'use strict';

var request    = require('request'),
    sinon      = require('sinon'),
    should = require('chai').should(),
    fakeredis = require('fakeredis'),
    redis = require('redis');

var device, client;

describe('device initializer', function() {
    before(function(done){
        sinon.stub(redis, 'createClient', fakeredis.createClient);
        client = redis.createClient();
        device = require('../initializers/device')(client);

        var ownerKey = 'owners:owner:12345678';
        client.hset(ownerKey, 'token', '12345678');
        client.hset(ownerKey, 'uuid', '12345678');

        done();
    });

    after(function(done){
        redis.createClient.restore();
        done();
    });

    it('should get owner header', function(done) {

        device.getOwnerHeader(function(err, res) {
            should.not.exist(err);
            done();
        });
    });

    it('call redis keys', function(done) {
        var keyword = '';
        device.getDevices(keyword, function(err, res) {
            should.exist(res);
            done();
        });
    });
});

