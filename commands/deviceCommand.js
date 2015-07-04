'use strict';

var utils = require('../utils'),
    async = require('async'),
    redis = require('../initializers/redis'),
    device = require('../initializers/device')(redis),
    _ = require('lodash');

var master = 'owner',
    defaultTimes = 5;

//require('request-debug')(request);

function validatePrefix(prefix, callback) {
    if (!utils.checkDevices(prefix)) {
        return callback(new Error('--prefix must be action or trigger'));
    } else {
        callback(null, prefix);
    }
}

function getWhiteDevice(owner, keyword, authHeader, callback) {
    // owner is null if himself
    if(!owner) return callback(null, owner, authHeader, null);
    device.getOwnerHeader(function(err, res) {
        if(err) return callback(err);
        var form = {
            discoverWhitelist: [res.meshblu_auth_uuid],
            receiveWhitelist: [res.meshblu_auth_uuid]
        };

        if (utils.isTrigger(keyword)) {
            device.getDevice(utils.buildActionName(keyword, res.meshblu_auth_token),
                             function(err, res) {
                                 if (err) return callback(err);
                                 form.discoverWhitelist.push(res.uuid);
                                 form.receiveWhitelist.push(res.uuid);
                                 callback(null, owner, authHeader, form);
                             });
        } else {
            callback(null, owner, authHeader, form);
        }
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
        var opts = utils.buildBaseOptions(owner, prefix, n);
        async.waterfall([
            function(callback) {
                device.doPostDevice(opts, callback);
            },
            device.doPutClaimDevice,
            _.partial(getWhiteDevice, owner),
            device.putWhiteDevice
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

function prettyDevice(keyword, res, callback){
    var head = _.keys(res).sort();
    var body = _.map(head, function(n) {return res[n]});
    var retval = utils.prettyTable([[keyword].concat(body)],
                               {head: ['keyword'].concat(head)});
    callback(null, retval);
}

function _commandOwner(options, callback) {
    device.getOwnerHeader(function(err, res){
        redis.quit();
        if (err) return callback(err);
        prettyDevice(utils.master, res, callback)
    });
}

function _commandShow(options, callback) {
    device.getDevice(options.keyword, function(err, res){
        redis.quit();
        if (err) return callback(err);
        prettyDevice(options.keyword, res, callback)
    });
}

function _commandList(options) {
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
        _.partial(createDevice, defaultTimes, utils.action),
        _.partial(createDevice, defaultTimes, utils.trigger),
    ], function(err, results) {
        if(err) {
            redis.quit();
            console.log(err.message);
        } else {
            device.getOwnerHeader(function(err, res) {
                console.log("devices registered successfully, owner is ", res);
                redis.quit();
            });
        }
    });
}

function whitenDevice(fromKeyword, toKeyword, authHeader, body, callback) {
    if(! body) {
        return callback(new Error(toKeyword + ' is not found'));
    }
    var toDevice = body.devices[0];
    device.getDevice(fromKeyword, function(err, res) {
        if (err) return callback(err);
        var fromUuid = res.uuid
        if(utils.isWhiten(toDevice, fromUuid)) {
            var msg = toDevice.keyword+' whitelists already contains '+fromKeyword;
            return callback(new Error(msg));
        }
        var form = utils.buildWhiteToForm(toDevice, fromUuid);
        device.putWhiteDevice(true, authHeader, form, callback);
    });
};

function commandWhiten(options) {
    var fromKeyword = options.from;
    var toKeyword = options.to;
    async.waterfall([
        function(callback) {
            if(! fromKeyword || ! toKeyword){
                callback(new Error(
                    'from ['+fromKeyword+'] and to ['+toKeyword+'] device must be set'));
            }
            callback(null);
        },
        function(callback) {
            //_.partial(device.getDevice, toKeyword),
            device.getDevice(toKeyword, callback);
        },
        device.httpGetDevice,
        _.partial(whitenDevice, fromKeyword, toKeyword)
    ], function(err, results) {
        redis.quit();
        if(err) return console.log(err.message);
        else console.log(results);
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

function outCallback(err, res) {
    if(err) console.log(err);
    else console.log(res);
}

module.exports = {
    commandOwner: function commandOwner(options) {
        _commandOwner(options, outCallback);
    },
    commandShow: function commandShow(options) {
        _commandShow(options, outCallback);
    },
    commandList: function commandList(option) { 
       _commandList(options, outCallback);
    },
    commandRegister: commandRegister,
    commandCreate: commandCreate,
    commandWhiten: commandWhiten
}
