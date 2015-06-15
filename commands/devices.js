'use strict';
var request = require('request'),
    utils = require('../utils'),
    async = require('async'),
    Device = require('../model/devices'),
    _ = require('lodash'),
    master = 'owner';
//require('request-debug')(request);

function checkDevices(prefix) {
    return _.includes(['action','trigger'],prefix);
}

function validatePrefix(prefix,callback) {
    if (!checkDevices(prefix)) {
        return callback(new Error('--prefix must be action or trigger'));
    } else {
        callback(null,prefix);
    }
}

/*
function postDevice(opts, callback) {
    httpOptions = utils.requestOptions('devices', null, opts);
    request.post(httpOptions,function(err, response, body) {        
        if(err || response.statusCode != 201){
            console.log(err);
            return callback(new Error('status: ', response.statusCode));
        } else {
            var body = JSON.parse(body);
            var key = '';
            if(_.startsWith(opts.keyword,master)){
                key = body.keyword + ':' + body.token;
            } else {
                key = body.keyword;
            }
            console.log(body);
            client.hset(key,'token', body.token);
            client.hset(key,'uuid', body.uuid);
            var oathHeader = meshbluHeader(body.uuid,body.token);

            callback(null, body.keyword, oathHeader);
        }
    });
}
*/
/*
function createDevices(client,owner,prefix,times,callback){
    async.timesSeries(times, function(n, callback) {

        var opts = {
            keyword: (!owner ? prefix : prefix+'-'+(n+1)),
            token: utils.randomToken()
        };

        async.waterfall([
            postDevice.bind(null,opts),
            function(keyword,oathHeader,callback){
                httpOptions = utils.requestOptions('claimdevice/'+oathHeader.meshblu_auth_uuid,
                                                  oathHeader);
                request.put(httpOptions,function(err, response, body) {
                    if (err || response.statusCode != 200){
                        console.log(err);
                        return callback(new Error('status: ',response.statusCode));
                    } else {
                        var body = JSON.parse(body);
                        callback(null,keyword,oathHeader);
                    }
                });
            },
            function(keyword,oathHeader,callback) {
                if(!owner) return callback(null,keyword,oathHeader,null);
                var form = {
                    discoverWhitelist: [owner.meshblu_auth_uuid],
                    receiveWhitelist: [owner.meshblu_auth_uuid]
                };
                if (keyword.indexOf('action') === 0) {
                    //getDevice(client,'trigger-'+keyword.split('-')[1],
                    client.getDevice('trigger-'+keyword.split('-')[1],
                              function(err,res) {
                                  if (err) return callback(err);
                                  form.discoverWhitelist.push(res.uuid);
                                  form.receiveWhitelist.push(res.uuid);
                                  callback(null,keyword,oathHeader,form);
                              });
                } else {
                    callback(null,keyword,oathHeader,form);
                }
            },
            function(keyword,oathHeader,form,callback) {
                if(!owner) return callback(null,oathHeader);
                
                httpOptions = utils.requestOptions('devices/'+oathHeader.meshblu_auth_uuid,
                                                   oathHeader,
                                                   form);
                request.put(httpOptions,function(err, response, body) {
                    if (err || response.statusCode != 200) {
                        console.log(err);
                        return callback(new Error('status: ',response.statusCode));
                    } else {
                        var body = JSON.parse(body);
                        callback(null,oathHeader);
                    }
                });
            }
        ],
        function(err,results) {
            if (err) return callback(err);
            callback(null,results);
        });
    },
    function(err, results) {
        if (err) return callback(err);
        callback(null,results);
    });    
}
*/
/*
function meshbluHeader(uuid,token) {
    return {meshblu_auth_uuid: uuid,
            meshblu_auth_token: token};
}
*/
/*
function ownerExists(client,callback) {
    client.keys(master+':*',function(err,res){
        if (err) return callback(err);
        callback(null,res);
    });
}
*/
/*
function getDevice(client,name,callback) {
    client.hgetall(name, function (err,res) {
        if (err) return callback(err);
        callback(null, res);
    });
}
*/

/*
function getOwner(client,callback){
    async.waterfall([
        function(callback){
            ownerExists(client,function(err,res){
                if (err) return callback(err);
                if (res.length == 0) {
                    return callback(new Error('owner not found'));
                } else {
                    callback(null,res[0]);
                }
            });
        },
        function(ownerKey,callback) {
            //client.get(ownerKey,function(err,res){
            //    if (err) return callback(err);
            //    var token = ownerKey.split(':')[1];
            //    var owner = meshbluHeader(res,token);
            //    callback(null, owner);
            //});

            client.hgetall(ownerKey, function (err,res) {
                if (err) return callback(err);
                var owner = meshbluHeader(res.uuid,res.token);
                callback(null, owner);
            });
        }
    ],
    function(err,results) {
        //client.quit();
        if (err) return callback(err);
        callback(null,results);
    });
}
*/

module.exports = {
    commandOwner: function(options) {

        /*
        client = redis.createClient(process.env.REDIS_PORT_6379_TCP_PORT,
                                process.env.REDIS_PORT_6379_TCP_ADDR);
        client.on("error", function (err) {
            console.log(err);
        });
        */
        
        //ownerExists(client,function(err,res){
        var client = new Redis();
        client.ownerExists(function(err,res){
            if (err) return callback(err);
            if (res.length > 0) {
                console.log(res[0]);
            } else {
                console.log("owner not exists");
            }
            //client.quit();
            client.endConnection();
        });
    },
    commandRegister: function(options) {
        var prefix = master,
            times = 1;
        /*
        client = redis.createClient(process.env.REDIS_PORT_6379_TCP_PORT,
                                process.env.REDIS_PORT_6379_TCP_ADDR);
        client.on("error", function (err) {
            console.log(err);
        });
        */
        var device = new Device();
        async.waterfall([
            function(callback) {
                //ownerExists(client,function(err,res){
                device.ownerExists(function(err,res) {
                    if (err) return callback(err);
                    if (res.length > 0) {
                        return callback(new Error('owner shoud be one ['+res+'] exists.'));
                    } else {
                        callback(null);
                    }
                });
            },
            function(callback) {
                //createDevices(client,null,prefix,times,callback);
                device.createDevices(null,prefix,times,callback);
            },
            function(res,callback){
                if(!res) return callbck(new Error('owner create failed'));
                var owner = res[0];
                //createDevices(client,owner,'trigger',5,
                device.createDevices(owner,'trigger',5,
                              function(err,res){
                                  if(err) return callback(err);
                                  callback(null,owner);
                              });
            },
            function(owner,callback){
                //createDevices(client,owner,'action',5,
                device.createDevices(owner,'action',5,
                                     function(err,res){
                                         if(err) return callback(err);
                                         callback(null,owner);
                                     });
            }
        ], function(err, results){
            //client.quit();
            device.endConnection();
            if(err) return console.log(err.message);
            console.log("devices registered successfully, owner is ", results)
        });
    },
    commandCreate: function(options) {
        /*
        client = redis.createClient(process.env.REDIS_PORT_6379_TCP_PORT,
                                    process.env.REDIS_PORT_6379_TCP_ADDR);
        client.on("error", function (err) {
            console.log(err);
        });
        */
        var device = new Device();
        async.waterfall([
            function(callback) { 
                var prefix = options.prefix;
                if (!checkDevices(prefix)) {
                    return callback(new Error('--prefix must be action or trigger'));
                }

                var times = options.times;
                if(isNaN(times) || times < 1) {
                    return callback(new Error('--times must be > 0'));
                } else {
                    //callback(null,client,prefix,times);
                    callback(null,prefix,times);
                }
            },
            function(prefix,times,callback) {
                //getOwner(client,function(err,owner){
                device.getOwner(function(err,owner){
                    if (err) return callback(err);
                    //createDevices(client,owner,prefix,times,callback);
                    device.createDevices(owner,prefix,times,callback);
                });
            }  
        ],
        function(err, results){
            //client.quit();
            device.encConnection();
            if(err) console.log(err);
        });
    },
    /*
    commandDelete: function(options) {

        var prefix = options.prefix;
        if (!validatePrefix(prefix)) return;

        var keyword = prefix.concat('-*');

        client.keys(keyword,function(err,res){
            res.forEach(function (reply, i) {
                client.del(reply, function(err, o) {
                    if(err) throw err;
                });
            });
            //client.quit();
        });

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
    },
    commandList: function(options) {
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
    }*/
}
