'use strict';

var utils = require('../utils'),
    async = require('async'),
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

function getWhiteDevice(device, owner, keyword, authHeader, callback) {
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

function ownerCheck(device, callback) {
    device.ownerExists(function(err, res) {
        if (err) return callback(err);
        if (res.length > 0) {
            return callback(new Error('owner shoud be one; ['+res+'] exists.'));
        } else {
            callback(null);
        }
    });
}


function createDevice(device, times, prefix, owner, callback) {
    async.timesSeries(times, function(n, callback) {
        var opts = utils.buildBaseOptions(owner, prefix, n);
        async.waterfall([
            function(callback) {
                device.doPostDevice(opts, callback);
            },
            device.doPutClaimDevice,
            _.partial(getWhiteDevice, device, owner),
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

function createOwner(device, callback) {
    createDevice(device, 1, master, null, callback);
}

function prettyDevice(keyword, res, callback){
    var head = _.keys(res).sort();
    var body = _.map(head, function(n) {return res[n]});
    var retval = utils.prettyTable([[keyword].concat(body)],
                               {head: ['keyword'].concat(head)});
    callback(null, retval);
}

function prettyDevices(res, callback){
    if(_.isEmpty(res)) return callback(new Error('devices not found'));

    var head = _.keys(res[0]).sort();
    var body = _.map(res, function(r) {
        return _.map(head, function(n) {return r[n]});
    });

    var retval = utils.prettyTable(body, {head: head});
    callback(null, retval);
}

function _owner(device, callback) {
    device.getOwnerHeader(function(err, res){
        device.quit();
        if (err) return callback(err);
        prettyDevice(utils.master, res, callback)
    });
}

function _show(device, options, callback) {
    device.getDevice(options.keyword, function(err, res){
        device.quit();
        if (err) return callback(err);
        prettyDevice(options.keyword, res, callback)
    });
}

function _list(device, options, callback) {
    device.quit();
    var res = [
        {name: 1, value: 1},
        {name: 2, value: 2}
    ];
    prettyDevices(res, callback);
}


function _create(options) {
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

function _register(device, options, callback) {
    async.waterfall([
        _.partial(ownerCheck, device),
        _.partial(createOwner, device),
        _.partial(createDevice, device, defaultTimes, utils.action),
        _.partial(createDevice, device, defaultTimes, utils.trigger),
    ], function(err, results) {
        if(err) {
            device.quit();
            callback(err);
        } else {
            device.getOwnerHeader(function(err, res) {
                device.quit();
                prettyDevice(utils.master, res, callback)
            });
        }
    });
}

function whitenDevice(device, fromKeyword, toKeyword, authHeader, body, callback) {
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

function _whiten(device, options, callback) {
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
            device.getDevice(toKeyword, callback);
        },
        device.httpGetDevice,
        _.partial(whitenDevice, device, fromKeyword, toKeyword)
    ], function(err, results) {
        device.quit();
        var msg = fromKeyword + ' can send message to ' + toKeyword;
        callback(err, msg);
    });
}

function _delete(device, options) {
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
    device.quit();
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
    if(err) console.log(err.message);
    else console.log(res);
}

module.exports = function(redis) {
    var device = require('../initializers/device')(redis);
    return {
        owner: function() {
            _owner(device, outCallback);
        },
        show: function(options) {
            _show(device, options, outCallback);
        },
        register: function(options) {
            _register(device, options, outCallback);
        },
        whiten: function(options) {
            _whiten(device, options, outCallback);
        },
        list: function(options) {
            _list(options, outCallback);
        },
        create: function(options) {
            _create(options);
        }
    }
}
