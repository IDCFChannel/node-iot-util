'use strict';

var request = require('request'),
    utils = require('../utils'),
    async = require('async'),
    redis = require('redis'),
    _ = require('lodash'),
    master = 'owner';

var Device = function () { 
    if (!(this instanceof Device)) return new Device();
    this.client = redis.createClient(process.env.REDIS_PORT_6379_TCP_PORT,
                                     process.env.REDIS_PORT_6379_TCP_ADDR, {
                                         "connection_timeout": 1.0
                                     });
    this.client.on('error', function(err) {
        if (err) {
            console.error('error connecting redis for recommendations: ', err);
            return;
        }
    });

    this.client.on('reconnecting', function() {
        console.log('reconnecting');
    });
};

Device.prototype.endConnection = function () {
    this.client.quit();
};

Device.prototype.meshbluHeader = function(res) {
    return {
        meshblu_auth_uuid: res.uuid,
        meshblu_auth_token: res.token
    };
};

Device.prototype.deleteDevices = function(owner, prefix, times, callback) {
};

function isDevice(keyword,name) {
    return _.startsWith(keyword, name);
}

function isMaster(keyword) {
    return isDevice(keyword, master);
}

function isAction(keyword) {
    return isDevice(keyword, 'action');
}

function doPostDevice(self, opts, callback) {
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
            self.client.hset(key, 'token', body.token);
            self.client.hset(key, 'uuid', body.uuid);
            var authHeader = self.meshbluHeader(body);
            callback(null, body.keyword, authHeader);
        }
    });
}

function doPutClaimDevice(keyword, authHeader, callback) {
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
}

Device.prototype.getDevice = function(name, callback) {
    this.client.hgetall(name, function (err, res) {
        if (err) return callback(err);
        if (!res) return callback(new Error('device not found from name; ', name));
        callback(null, res);
    });
};

Device.prototype.getWhiteToDevice = function(fromDeviceName, fromDeviceUuid, authHeader, callback) {
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
};

function doGetWhiteDevice(self, owner, keyword, authHeader, callback) {
    if(!owner) return callback(null, authHeader, null);
    var form = {
        discoverWhitelist: [owner.meshblu_auth_uuid],
        receiveWhitelist: [owner.meshblu_auth_uuid]
    };

    if (isAction(keyword)) {
        var fromDeviceName = 'trigger-'+keyword.split('-')[1];
        self.getDevice(fromDeviceName, function(err, res) {
            if (err) return callback(err);
            form.discoverWhitelist.push(res.uuid);
            form.receiveWhitelist.push(res.uuid);
            callback(null, authHeader, form);
        });

    } else {
        callback(null, authHeader, form);
    }
}

Device.prototype.getDeviceRest = function(authHeader, callback) {
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
};

Device.prototype.putWhiteDevice = function(owner, authHeader, form, callback) {
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
};

Device.prototype.createDevices = function(owner, prefix, times, callback) {
    var self = this;
    async.timesSeries(times, function(n, callback) {
        var opts = {
            keyword: (!owner ? prefix : prefix+'-'+(n+1)),
            token: utils.randomToken()
        };
        async.waterfall([
            _.partial(doPostDevice, self, opts),
            doPutClaimDevice,
            _.partial(doGetWhiteDevice, self, owner),
            function(authHeader, form, callback) {
                self.putWhiteDevice(owner, authHeader, form, callback);
            }            
        ],
        function(err,results) {
            if (err) return callback(err);
            callback(null, results);
        });
    },
    function(err, results) {
        if (err) return callback(err);
        callback(null, results);
    });    
};

Device.prototype.getOwner = function(callback) {
    var self = this;
    async.waterfall([
        function(callback){
            this.client.ownerExists(function(err, res) {
                if (err) return callback(err);
                if (res.length == 0) {
                    return callback(new Error('owner not found'));
                } else {
                    callback(null, res[0]);
                }
            });
        },
        function(ownerKey, callback) {
            this.client.hgetall(ownerKey, function (err,res) {
                if (err) return callback(err);
                var owner = self.meshbluHeader(res);
                callback(null, owner);
            });
        }
    ],
    function(err,results) {
        if (err) return callback(err);
        callback(null, results);
    });
};

Device.prototype.ownerExists = function(callback) {
    this.client.keys(master+':*', function(err, res) {
        if (err) return callback(err);
        callback(null, res);
    });
};

module.exports = Device;
