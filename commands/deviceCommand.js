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

function ownerHeader(device, callback) {
    device.getOwnerHeader(callback);
}

function delDevice(device, callback) {
    async.waterfall([
        function(next) {
            async.series([
                function(devNext) {
                    device.getNameDevices(utils.triggers, devNext);
                },
                function(devNext) {
                    device.getNameDevices(utils.actions, devNext);
                },
            ],
            function(err, results) {
                next(err, _.flatten(results));
            });
        },
        function(devices, next) {
            device.getOwnerHeader(function(err, res) {
                if(err) return next(err);
                device.doDelDevices(devices, res.meshblu_auth_token, next);
            });           
        }
    ],
    function(err, results) {
        callback(err, results);
    });
}

function delOwner(device, callback) {
    device.getOwnerDevice(function(err, res) {
        if(err) return callback(err);
        var ownerDevice = _.merge(res, {keyword: utils.master});
        device.doDelDevices([ownerDevice], res.token, callback);
    });
}

function createDevice(device, times, namespace, owner, callback) {
    async.timesSeries(times, function(n, callback) {
        var opts = utils.buildBaseOptions(owner, namespace, n);
        async.waterfall([
            function(callback) {
                device.doPostDevice(opts, callback);
            },
            device.doPutClaimDevice,
            _.partial(getWhiteDevice, device, owner),
            device.doPutWhiteDevice
        ], function(err, results) {
            callback(err, results);
        });
    }, function(err, results) {
        callback(err, results);
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
        //device.quit();
        if (err) return callback(err);
        prettyDevice(utils.master, res, callback)
    });
}

function _show(device, options, callback) {
    device.getDevice(options.keyword, function(err, res){
        //device.quit();
        if (err) return callback(err);
        prettyDevice(options.keyword, res, callback)
    });
}

function _list(device, options, callback) {
    device.getDevices(options.prefix, function(err, res) {
        //device.quit();
        if (err) return callback(err);
        prettyDevices(res, callback)
    });
}

function _register(device, options, callback) {
    async.waterfall([
        _.partial(ownerCheck, device),
        _.partial(createOwner, device),
        _.partial(createDevice, device, defaultTimes, utils.action),
        _.partial(createDevice, device, defaultTimes, utils.trigger),
    ], function(err, results) {
        if(err) {
            //device.quit();
            callback(err);
        } else {
            device.getOwnerHeader(function(err, res) {
                //device.quit();
                prettyDevice(utils.master, res, callback)
            });
        }
    });
}

function _del(device, callback) {
    async.series([
        _.partial(delDevice, device),
        _.partial(delOwner, device)
    ], function(err, results) {
        //device.quit();
        var keywords = _.pluck(_.flatten(results), 'keyword').join(', ');
        callback(err, keywords+' are deleted.');
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
        device.doPutWhiteDevice(true, authHeader, form, callback);
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
        device.doGetDevice,
        _.partial(whitenDevice, device, fromKeyword, toKeyword)
    ], function(err, results) {
        //device.quit();
        var msg = fromKeyword + ' can send message to ' + toKeyword;
        callback(err, msg);
    });
}

module.exports = function(device) {
    return {
        _list: _list,
        owner: function(callback) {
            _owner(device, callback);
        },
        show: function(options, callback) {
            _show(device, options, callback);
        },
        register: function(options, callback) {
            _register(device, options, callback);
        },
        whiten: function(options, callback) {
            _whiten(device, options, callback);
        },
        del: function(callback) {
            _del(device, callback);
        },
        list: function(options, callback) {
            _list(device, options, callback);
        }
    }
}
