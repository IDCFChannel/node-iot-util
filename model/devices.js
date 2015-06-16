'use strict';

var request = require('request'),
    utils = require('../utils'),
    async = require('async'),
    redis = require('redis'),
    _ = require('lodash'),
    master = 'owner';

function meshbluHeader(uuid,token) {
    return {meshblu_auth_uuid: uuid,
            meshblu_auth_token: token};
}

var Device = function () { 
    if (!(this instanceof Device)) return new Device();
    this.client = redis.createClient(process.env.REDIS_PORT_6379_TCP_PORT,
                                     process.env.REDIS_PORT_6379_TCP_ADDR,{
                                         "connection_timeout": 1.0
                                     });
    this.client.on('error',function(err) {
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

Device.prototype.deleteDevices = function(owner, prefix, times, callback) {

};

Device.prototype.createDevices = function(owner, prefix, times, callback) {
    var self = this;
    async.timesSeries(times, function(n, callback) {
        async.waterfall([
            function(callback) {
                var opts = {
                    keyword: (!owner ? prefix : prefix+'-'+(n+1)),
                    token: utils.randomToken()
                };
                var httpOptions = utils.requestOptions('devices', null, opts);
                request.post(httpOptions, function(err, response, body) {        
                    if(err || response.statusCode != 201){
                        return callback(new Error('status: ', response.statusCode));
                    } else {
                        var body = JSON.parse(body);
                        var key = '';
                        if(_.startsWith(opts. keyword, master)) {
                            key = body.keyword + ':' + body.token;
                        } else {
                            key = body.keyword;
                        }
                        console.log(body);
                        self.client.hset(key, 'token', body.token);
                        self.client.hset(key, 'uuid', body.uuid);
                        var authHeader = meshbluHeader(body.uuid, body.token);
                        callback(null, body.keyword, authHeader);
                    }
                });
            },
            function(keyword, authHeader, callback) {
                var httpOptions = utils.requestOptions('claimdevice/'+authHeader.meshblu_auth_uuid,
                                                  authHeader);
                request.put(httpOptions,function(err, response, body) {
                    if (err || response.statusCode != 200) {
                        return callback(new Error('status: ',response.statusCode));
                    } else {
                        var body = JSON.parse(body);
                        callback(null, keyword, authHeader);
                    }
                });
            },
            function(keyword, authHeader, callback) {
                if(!owner) return callback(null, keyword, authHeader, null);
                var form = {
                    discoverWhitelist: [owner.meshblu_auth_uuid],
                    receiveWhitelist: [owner.meshblu_auth_uuid]
                };
                if (keyword.indexOf('action') === 0) {
                    self.getDevice('trigger-'+keyword.split('-')[1],
                                   function(err,res) {
                                       if (err) return callback(err);
                                       form.discoverWhitelist.push(res.uuid);
                                       form.receiveWhitelist.push(res.uuid);
                                       callback(null, keyword, authHeader, form);
                                   });
                } else {
                    callback(null, keyword, authHeader, form);
                }
            },
            function(keyword, authHeader, form, callback) {
                if(!owner) return callback(null, authHeader);
                
                var httpOptions = utils.requestOptions('devices/'+authHeader.meshblu_auth_uuid,
                                                   authHeader,
                                                   form);
                request.put(httpOptions,function(err, response, body) {
                    if (err || response.statusCode != 200) {
                        return callback(new Error('status: ', response.statusCode));
                    } else {
                        var body = JSON.parse(body);
                        callback(null, authHeader);
                    }
                });
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


Device.prototype.getDevice = function(name,callback) {
    this.client.hgetall(name, function (err,res) {
        if (err) return callback(err);
        callback(null, res);
    });
};

Device.prototype.getOwner = function(callback){
    async.waterfall([
        function(callback){
            this.client.ownerExists(function(err,res){
                if (err) return callback(err);
                if (res.length == 0) {
                    return callback(new Error('owner not found'));
                } else {
                    callback(null,res[0]);
                }
            });
        },
        function(ownerKey,callback) {
            this.client.hgetall(ownerKey, function (err,res) {
                if (err) return callback(err);
                var owner = meshbluHeader(res.uuid,res.token);
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
    this.client.keys(master+':*',function(err,res){
        if (err) return callback(err);
        callback(null,res);
    });
};

module.exports = Device;
