'use strict';

var request = require('request'),
    utils = require('../utils'),
    async = require('async'),
    _ = require('lodash'),
    master = utils.master;

module.exports = function(client) {
    return {
        quit: function() {
            client.quit();
        },

        getEntryKey: function(body, opts, callback) {
            var self = this;
            if(utils.isOwner(opts.keyword)) {
                callback(null, utils.buildOwnerName(body.keyword, body.token));
            } else {
                self.getOwnerHeader(function(err, res) {
                    if(err) return callback(err);
                    callback(null,
                             utils.buildDeviceName(body.keyword, res.meshblu_auth_token));
                });
            }
        },

        doDelDevices: function(devices, ownerToken, callback) {
            var self = this;
            async.each(devices, function(d, delNext) {
                var httpOptions = utils.requestOptions(
                    'devices/'+d.uuid, utils.buildHeader(d));
                request.del(httpOptions, function(err, response, body) {
                    if(err || response.statusCode != 200){
                        delNext(new Error('status: '+ response.statusCode));
                    } else {
                        var key = utils.buildDeviceName(d.keyword, ownerToken);
                        client.del(key, delNext);
                    }
                });
            },
            function(err) {
                callback(err, devices);
            });
        },

        // call meshblu api and store hashed token in redis
        doPostDevice: function(opts, callback) {
            var self = this;
            var httpOptions = utils.requestOptions('devices', null, opts);
            request.post(httpOptions, function(err, response, body) {
                if(err || response.statusCode != 201){
                    return callback(new Error('status: '+ response.statusCode));
                } else {
                    var body = JSON.parse(body);
                    if (!body) return callback(new Error('no response frm post device'));
                    self.getEntryKey(body, opts, function(err,res) {
                        client.hset(res, 'token', body.token);
                        client.hset(res, 'uuid', body.uuid);
                        var authHeader = utils.buildHeader(body);
                        callback(null, body.keyword, authHeader);
                    });
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
                    //console.log(body);
                    callback(null, keyword, authHeader);
                }
            });
        },

        getNameDevices: function(namespace, callback) {
            client.keys(namespace+'*', function(err, keys) {
                if(err) return callback(err);
                var results = [];
                async.each(keys.sort(), function(key, next) {
                    client.hgetall(key, function (err, res) {
                        results.push(_.merge(res,
                                             {keyword: utils.destructKeyword(key)}));
                        next(null);
                    });              
                },
                function(err) {
                    callback(err, results);                    
                });
            });
        },

        getDevices: function(prefix, callback) {
            if(prefix && ! utils.checkDevices(prefix))
                return callback(new Error('invalid prefix: '+prefix));
            var self = this;
            async.series([
                function(next) {
                    if(_.isEmpty(prefix) || utils.isTrigger(prefix))
                        self.getNameDevices(utils.triggers, next);
                    else
                        next(null);
                },
                function(next) {
                    if(_.isEmpty(prefix) || utils.isAction(prefix))
                        self.getNameDevices(utils.actions, next);
                    else
                        next(null);
                }
            ], function(err, results) {
                callback(err, _.flatten(_.compact(results)));
            });
        },

        getDevice: function(keyword, callback) {
            if (!keyword) return callback(new Error('keyword is required'));
            var self = this;
            self.getOwnerHeader(function(err, res) {
                if(err) return callback(err);
                var key = utils.buildDeviceName(keyword, res.meshblu_auth_token);
                client.hgetall(key, function (err, res) {
                    if (err) return callback(err);
                    if (!res) return callback(new Error('device not found from name; ', keyword));
                    callback(null, res);
                });
            });
        },

        doGetDevice: function(toDevice, callback) {
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
      
        doPutWhiteDevice: function(owner, authHeader, form, callback) {
            if(!owner) return callback(null, authHeader);
            var httpOptions = utils.requestOptions('devices/'+authHeader.meshblu_auth_uuid,
                                                   authHeader,
                                                   form);
            request.put(httpOptions, function(err, response, body) {
                if (err || response.statusCode != 200) {
                    return callback(new Error('status: '+ response.statusCode));
                } else {
                    var body = JSON.parse(body);
                    //console.log(body);
                    callback(null, authHeader);
                }
            });
        },

        getOwnerDevice: function(callback) {
            this.ownerExists(function(err, res) {
                if (err) return callback(err);
                if (res.length == 0) {
                    return callback(new Error('owner not found'), res);
                } else {
                    client.hgetall(res[0], callback);
                }
            });
        },

        getOwnerHeader: function(callback) {
            this.getOwnerDevice(function(err, res) {
                if(err) return callback(err);
                var ownerHeader = utils.buildHeader(res);
                callback(null, ownerHeader);
            });
        },

        ownerExists: function(callback) {
            var ownerName = utils.buildOwnerName(utils.master, '*');
            client.keys(ownerName, callback);
        }
    }
}
