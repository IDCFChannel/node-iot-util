'use strict';
var request = require('request'),
    utils = require('../utils'),
    async = require('async'),
    Device = require('../model/devices'),
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

function doOwnerCheck(device, callback) {
    device.ownerExists(function(err, res) {
        if (err) return callback(err);
        if (res.length > 0) {
            return callback(new Error('owner shoud be one; ['+res+'] exists.'));
        } else {
            callback(null);
        }
    });
}

function doCreateOwner(device, callback) {
    device.createDevices(null, master, 1, callback);
}

function doCreateDevice(device, defaultTimes, deviceType, owner, callback) {
    if (_.isArray(device)) owner = owner[0];
    device.createDevices(owner, deviceType, defaultTimes,
                         function(err, res) {
                             if(err) return callback(err);
                             callback(null, owner);
                         });    
}

function commandOwner(options) {
    var device = new Device();
    device.getOwner(function(err, res){
        if (err) console.log(err);
        else console.log(res);
        device.endConnection();
    });
}

function commandRegister(options) {
    var device = new Device();
    async.waterfall([
        _.partial(doOwnerCheck, device),
        _.partial(doCreateOwner, device),
        _.partial(doCreateDevice, device, defaultTimes, 'trigger'),
        _.partial(doCreateDevice, device, defaultTimes, 'action'),
    ], function(err, results) {
        device.endConnection();
        if(err) return console.log(err.message);
        console.log("devices registered successfully, owner is ", results);
    });
}


function commandWhiten(options) {
    var fromDeviceName = options.from;
    var toDeviceName = options.to;
    if(! fromDeviceName || ! toDeviceName){
        return console.log('from and to device must be set');
    }
    var device = new Device();
    async.waterfall([
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
        device.endConnection();
        if(err) return console.log(err.message);
        console.log(results);
    });
}

function commandDelete(options) {
    var prefix = options.prefix;
    if (!validatePrefix(prefix)) return;
    var device = new Device();
    var keyword = prefix + '-*';

    device.deleteDevices(keyword,function(err,res){
        res.forEach(function (reply, i) {
            client.del(reply, function(err, o) {
                if(err) throw err;
            });
        });
    });
    device.endConnection();
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
    commandWhiten: commandWhiten
}
