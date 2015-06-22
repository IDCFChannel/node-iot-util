'use strict';
var request = require('request'),
    utils = require('../utils'),
    async = require('async'),
    redis = require('../initializers/redis'),
    device = require('../initializers/device')(redis),
    
    _ = require('lodash');

var master = 'owner',
    defaultTimes = 5;

//require('request-debug')(request);

function checkDevices(prefix) {
    return _.includes(['action', 'trigger'], prefix);
}

function validatePrefix(prefix, callback) {
    if (!checkDevices(prefix)) {
        return callback(new Error('--prefix must be action or trigger'));
    } else {
        callback(null, prefix);
    }
}

function getOwner(callback) {
    device.getOwner(function(err, res){
        if (err) return callback(err);
        callback(null, res);
    });
}

function ownerCheck(callback) {
    device.ownerExists(function(err, res) {
        if (err) return callback(err);
        if (res.length > 0) {
            return callback(new Error('owner shoud be one; ['+res+'] exists.'));
        } else {
            callback(null);
        }
    });
}

function createDevice(times, prefix, owner, callback) {
    async.timesSeries(times, function(n, callback) {
        var opts = {
            keyword: (!owner ? prefix : prefix+'-'+(n+1)),
            token: utils.randomToken()
        };
        async.waterfall([
            
            function(callback) {
                device.doPostDevice(opts, callback);
            },
            
            //_.partial(device.doPostDevice, opts),
            function(keyword, authHeader, callback) {
                device.doPutClaimDevice(keyword, authHeader, callback);
            },
            function(keyword, authHeader, callback){
                device.doGetWhiteDevice(owner, keyword, authHeader, callback);
            },
            function(authHeader, form, callback) {
                device.putWhiteDevice(owner, authHeader, form, callback);
            }
        ], function(err, results) {
            if (err) return callback(err);
            callback(null, results);
        });
    }, function(err, results) {
        if (err) return callback(err);
        callback(null, results);
    });
}

function createOwner(callback) {
    createDevice(1, master, null, callback);
}

function commandOwner(options) {
    device.getOwner(function(err, res){
        if (err) console.log(err);
        else console.log(res);
        redis.quit();
    });
}

function commandCreate(options) {
/*
    async.waterfall([
        ownerCheck,
        createOwner,
        _.partial(createDevice, defaultTimes, 'trigger'),
    ], function(err, results) {
        device.endConnection();
        if(err) return console.log(err.message);
        console.log("devices registered successfully");
    });
*/
}

function commandRegister(options) {
    async.waterfall([
        ownerCheck,
        createOwner,
        _.partial(createDevice, defaultTimes, 'action'),
        _.partial(createDevice, defaultTimes, 'trigger'),
    ], function(err, results) {
        redis.quit();
        if(err) return console.log(err.message);
        console.log("devices registered successfully, owner is ", results);
    });
}

function commandWhiten(options) {
    var fromDeviceName = options.from;
    var toDeviceName = options.to;
    async.waterfall([
        function(callback) {
            if(! fromDeviceName || ! toDeviceName){
                return callback(new Error(console.log('from and to device must be set')));
            } else {
                callback(null);
            }
        },
        function(callback) {
            device.getDevice(fromDeviceName, callback);
        },
        function(fromDevice, callback) {
            device.getDevice(toDeviceName, function(err, res) {
                if (err) return callback(err);
                device.getWhiteToDevice(fromDeviceName, fromDevice.uuid,
                                        device.meshbluHeader(res), callback);
            });            
        },
        function(authHeader, form, callback) {
            device.putWhiteDevice(true, authHeader, form, callback);
        }
    ], function(err, results) {
        redis.quit();
        if(err) return console.log(err.message);
        console.log(results);
    });
}

function commandDelete(options) {
    var prefix = options.prefix;
    if (!validatePrefix(prefix)) return;
    var keyword = prefix + '-*';

    device.deleteDevices(keyword,function(err,res){
        res.forEach(function (reply, i) {
            client.del(reply, function(err, o) {
                if(err) throw err;
            });
        });
    });
    redis.quit();
/*
    var httpOptions = utils.requestOptions(__filename,
                                           {keyword:keyword,
                                            token:token});
    request.delete(httpOptions,function(error, response, body) {
        if (!error && response.statusCode == 201){
            var redis = require('redis'),
            client = redis.createClient(process.env.REDIS_PORT,
                                        process.env.REDIS_HOST);
            var body = JSON.parse(body),
            
            key = body.keyword + ':' + body.token;
            
            client.quit();
        } else if (error) {
            console.log('Error: ' + error);
        }
    });
*/
}

/*
function commandList(options) {
    client = redis.createClient(process.env.REDIS_PORT_6379_TCP_PORT,
                                process.env.REDIS_PORT_6379_TCP_ADDR);
    
    var prefix = options.prefix;
    
    async.series([
        function(callback) {
            if(error)
                }
    ],function(err)) {
        if (err) { console.log("error"); }
    }
    
    if (!validatePrefix(prefix)) return;
    
    var keyword = prefix;
    
    var httpOptions = utils.requestOptions(__filename,
                                           {keyword:keyword,
                                            token:token});
    
    request.get(httpOptions,function(error, response, body) {
        if (!error && response.statusCode == 201){
            var body = JSON.parse(body);
            console.log(body);
            
        } else if (error) {
            console.log('Error: ' + error);
        }
    });
}
*/

module.exports = {
    commandOwner: commandOwner,
    commandRegister: commandRegister,
    commandCreate: commandCreate,
    commandWhiten: commandWhiten
}
