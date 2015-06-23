'use strict';

var request = require('request'),
    utils = require('../utils'),
    async = require('async'),
    _ = require('lodash'),
    master = 'owner';

module.exports = function(client) {

    return {

        deleteDevices: function(owner, prefix, times, callback) {
        },

        doPostDevice: function(client, opts, callback) {
            var httpOptions = utils.requestOptions('devices', null, opts);
            request.post(httpOptions, function(err, response, body) {        
                if(err || response.statusCode != 201){
                    return callback(new Error('status: ', response.statusCode));
                } else {
                    var body = JSON.parse(body);
                    var key = '';
                    if(_.startsWith(opts.keyword, master)) {
                        key = body.keyword + ':' + body.token;
                    } else {
                        key = body.keyword;
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
            var httpOptions = utils.requestOptions('claimdevice/'+authHeader.meshblu_auth_uuid,
                                                   authHeader);
            request.put(httpOptions, function(err, response, body) {
                if (err || response.statusCode != 200) {
                    return callback(new Error('status: ', response.statusCode));
                } else {
                    var body = JSON.parse(body);
                    console.log(body);
                    callback(null, keyword, authHeader);
                }
            });
        },

        getDevice: function(name, callback) {
            client.hgetall(name, function (err, res) {
                if (err) return callback(err);
                if (!res) return callback(new Error('device not found from name; ', name));
                callback(null, res);
            });
        },

        getWhiteToDevice: function(fromDeviceName, fromDeviceUuid, authHeader, callback) {
            var self = this;
            self.getDeviceRest(authHeader, function(err, res) {
                if (err) return callback(err);
                var toDevice = res.devices[0];

                if (_.includes(toDevice.discoverWhitelist, fromDeviceUuid) ||
                    _.includes(toDevice.receiveWhitelist, fromDeviceUuid) ) {
                    return callback(new Error(toDevice.keyword + ' whitelists already contains ' + fromDeviceName));
                }

                var form = {
                    discoverWhitelist: toDevice.discoverWhitelist,
                    receiveWhitelist: toDevice.receiveWhitelist
                };

                form.discoverWhitelist.push(fromDeviceUuid);
                form.receiveWhitelist.push(fromDeviceUuid);
                callback(null, authHeader, form);
            })
        },
        getDeviceRest: function(authHeader, callback) {
            var httpOptions = utils.requestOptions('devices/'+authHeader.meshblu_auth_uuid,
                                                   authHeader,null);
            request.get(httpOptions, function(err, response, body) {
                if (err || response.statusCode != 200) {
                    return callback(new Error('status: ', response.statusCode));
                } else {
                    var body = JSON.parse(body);
                    callback(null, body);
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
                    return callback(new Error('status: ', response.statusCode));
                } else {
                    var body = JSON.parse(body);
                    console.log(body);
                    callback(null, authHeader);
                }
            });
        },
        /*
        Device.prototype.createDevices = function(owner, prefix, times, callback) {
            var self = this;
            async.timesSeries(times, function(n, callback) {
                var opts = {
                    keyword: (!owner ? prefix : prefix+'-'+(n+1)),
                    token: utils.randomToken()
                };
                async.waterfall([
                    _.partial(self.doPostDevice, opts),
                    doPutClaimDevice,
                    _.partial(doGetWhiteDevice, self, owner),
                    function(authHeader, form, callback) {
                        self.putWhiteDevice(owner, authHeader, form, callback);
                    }            
                ], function(err,results) {
                    if (err) return callback(err);
                    callback(null, results);
                });
            }, function(err, results) {
                if (err) return callback(err);
                callback(null, results);
            });    
        };
        */
        getOwner: function(callback) {
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
                    client.hgetall(ownerKey, function (err,res) {
                        var owner = utils.buildHeader(res);
                        callback(err, owner);
                    });
                }
            ], function(err,results) {
                //if (err) return callback(err);
                callback(err, results);
            });
        },

        ownerExists: function(callback) {
            /*
            client.keys(master+':*', function(err, res) {
                if (err) return callback(err);
                callback(err, res);
            });
            */
            client.keys(master+':*', callback);
        }
    }
}
