'use strict';

var request = require('request'),
    utils = require('../utils'),
    async = require('async'),
    _ = require('lodash'),
    master = utils.master;

module.exports = function(client) {

    return {

        deleteDevices: function(owner, prefix, times, callback) {
        },

        // call meshblu api and store hashed token in redis
        doPostDevice: function(client, opts, callback) {
            var httpOptions = utils.requestOptions('devices', null, opts);
            request.post(httpOptions, function(err, response, body) {        
                if(err || response.statusCode != 201){
                    return callback(new Error('status: '+ response.statusCode));
                } else {
                    var body = JSON.parse(body);
                    var key = '';
                    if(utils.isOwner(opts.keyword)) {
                        key = utils.buildOwnerName(body.keyword, body.token);
                    } else {
                        key = utils.buildDeviceName(body.keyword);
                    }
                    console.log(body);
                    client.hset(key, 'token', body.token);
                    client.hset(key, 'uuid', body.uuid);
                    var authHeader = utils.buildHeader(body);
                    callback(null, body.keyword, authHeader);
                }
            });
        },

        doPutClaimDevice: function(keyword, authHeader, callback) {
            var httpOptions = utils.requestOptions(
                'claimdevice/'+authHeader.meshblu_auth_uuid, authHeader);
            request.put(httpOptions, function(err, response, body) {
                if (err || response.statusCode != 200) {
                    return callback(new Error('status: '+ response.statusCode));
                } else {
                    var body = JSON.parse(body);
                    console.log(body);
                    callback(null, keyword, authHeader);
                }
            });
        },

        getDevice: function(keyword, callback) {
            var key = utils.buildDeviceName(keyword);
            client.hgetall(key, function (err, res) {
                if (err) return callback(err);
                if (!res) return callback(new Error('device not found from name; ', keyword));
                callback(null, res);
            });
        },

        httpGetDevice: function(toDevice, callback) {
            var authHeader = utils.buildHeader(toDevice);
            var httpOptions = utils.requestOptions(
                'devices/'+authHeader.meshblu_auth_uuid,
                authHeader, null);
            request.get(httpOptions, function(err, response, body) {
                if (err || response.statusCode != 200) {
                    return callback(new Error('status: '+ response.statusCode));
                } else {
                    callback(null, authHeader, JSON.parse(body));
                }
            });
        },
      
        putWhiteDevice: function(owner, authHeader, form, callback) {
            if(!owner) return callback(null, authHeader);
            var httpOptions = utils.requestOptions('devices/'+authHeader.meshblu_auth_uuid,
                                                   authHeader,
                                                   form);
            request.put(httpOptions, function(err, response, body) {
                if (err || response.statusCode != 200) {
                    return callback(new Error('status: '+ response.statusCode));
                } else {
                    var body = JSON.parse(body);
                    console.log(body);
                    callback(null, authHeader);
                }
            });
        },

        getOwnerHeader: function(callback) {
            var self = this;
            async.waterfall([
                function(callback){
                    self.ownerExists(function(err, res) {
                        if (err) return callback(err);
                        if (res.length == 0) {
                            return callback(new Error('owner not found'), res);
                        } else {
                            callback(null, res[0]);
                        }
                    });
                },
                function(ownerKey, callback) {
                    client.hgetall(ownerKey, function (err, res) {
                        var ownerHeader = utils.buildHeader(res);
                        callback(err, ownerHeader);
                    });
                }
            ], function(err, results) {
                callback(err, results);
            });
        },

        ownerExists: function(callback) {
            var ownerName = utils.buildOwnerName(utils.master, '*');
            client.keys(ownerName, callback);
        }
    }
}
