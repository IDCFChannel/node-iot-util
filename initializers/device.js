'use strict';

var request = require('request'),
    utils = require('../utils'),
    async = require('async'),
    _ = require('lodash'),
    master = 'owner';

function isDevice(keyword,name) {
    return _.startsWith(keyword, name);
}

function isMaster(keyword) {
    return isDevice(keyword, master);
}

function isAction(keyword) {
    return isDevice(keyword, 'action');
}

function isTrigger(keyword) {
    return isDevice(keyword, 'trigger');
}

module.exports = function(client) {

    return {
        meshbluHeader: function(res) {
            return {
                meshblu_auth_uuid: res.uuid,
                meshblu_auth_token: res.token
            };
        },

        deleteDevices: function(owner, prefix, times, callback) {
        },

        doPostDevice: function(opts, callback) {
            var self = this;
            console.log(self);
            var httpOptions = utils.requestOptions('devices', null, opts);
            request.post(httpOptions, function(err, response, body) {        
                if(err || response.statusCode != 201){
                    return callback(new Error('status: ', response.statusCode));
                } else {
                    var body = JSON.parse(body);
                    var key = '';
                    if(isMaster(opts.keyword)) {
                        key = body.keyword + ':' + body.token;
                    } else {
                        key = body.keyword;
                    }
                    console.log(body);
                    client.hset(key, 'token', body.token);
                    client.hset(key, 'uuid', body.uuid);
                    var authHeader = self.meshbluHeader(body);
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

        doGetWhiteDevice: function(owner, keyword, authHeader, callback) {
            if(!owner) return callback(null, authHeader, null);
            var self = this;
            var form = {
                discoverWhitelist: [owner.meshblu_auth_uuid],
                receiveWhitelist: [owner.meshblu_auth_uuid]
            };

            if (isTrigger(keyword)) {
                var fromDeviceName = 'action-'+keyword.split('-')[1];
                self.getDevice(fromDeviceName, function(err, res) {
                    if (err) return callback(err);
                    form.discoverWhitelist.push(res.uuid);
                    form.receiveWhitelist.push(res.uuid);
                    callback(null, authHeader, form);
                });
            } else {
                callback(null, authHeader, form);
            }
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
                        var owner = self.meshbluHeader(res);
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
