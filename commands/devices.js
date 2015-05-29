var request = require('request'),
    utils = require('../utils'),
    Chance = require('chance'),
    chance = new Chance(),
    async = require('async'),
    redis = require('redis'),
    master = 'mythings';

//require('request-debug')(request);

function randomToken() {
    return chance.hash({length: 8})    
}

function checkDevices(prefix) {
    return (prefix && ['action','trigger'].indexOf(prefix) > -1);
}

function validatePrefix(prefix,callback) {
    if (!validateDevices(prefix)) {
        return callback(new Error('--prefix must be action or trigger'));
    } else {
        callback(null,prefix);
    }
}

function createDevices(owner,prefix,times,callback){

    client = redis.createClient(process.env.REDIS_PORT_6379_TCP_PORT,
                                process.env.REDIS_PORT_6379_TCP_ADDR);

    async.timesSeries(times, function(n, callback) {
        async.waterfall([
            function(callback) {
                var keyword = ((!owner) ? prefix : prefix.concat('-').concat(n+1)),
                    token = randomToken(),
                    httpOptions = utils.requestOptions('devices',
                                                       null,
                                                       {keyword:keyword,
                                                        token:token});
                request.post(httpOptions,function(err, response, body) {
                    if (!err && response.statusCode == 201){
                        var body = JSON.parse(body),
                        uuid = body.uuid,
                        key = body.keyword + ':' + body.token;
                        console.log('@@@@@@ ',body.keyword);
                        console.log('@@@@@@ ',body.keyword);
                        client.on("error", function (err) {
                            console.log(err);
                        });

                        client.set(key,uuid);
                        console.log(key + '=' + uuid);
                    } else if (err) {
                        console.log(err);
                    }
                    callback(null,body.keyword,body.uuid,body.token);
                });
            },
            function(keyword,uuid,token){
                httpOptions = utils.requestOptions('claimdevice/'+uuid,
                                                  meshbluHeader(uuid,token));
                request.put(httpOptions,function(err, response, body) {
                    if (!err && response.statusCode == 200){
                        var body = JSON.parse(body);
                        client.on("error", function (err) {
                            console.log(err);
                        });
                        console.log(body);
                    } else if (err) {
                        console.log(err);
                    }
                    callback(null);
                });
                
            }
        ],
        function(err,results) {
            if (err) return callback(err);
            callback(null);
        });
    },
    function(err, results) {
        client.quit();
        if (err) return callback(err);
        callback(null);
    });    
}

function meshbluHeader(uuid,token) {
    return {meshblu_auth_uuid: uuid,
            meshblu_auth_token: token};
}

function getOwner(callback){
    client = redis.createClient(process.env.REDIS_PORT_6379_TCP_PORT,
                                process.env.REDIS_PORT_6379_TCP_ADDR);

    async.waterfall([
        function(callback){
            client.keys(master.concat(':*'),function(err,res){
                if (err) return callback(err);

                if (res.length == 0) {
                    return callback(new Error('owner not found'));
                } else if (res.length > 1) {
                    return callback(new Error('owner shoud be one: ',res));
                } else {
                    callback(null,res[0]);
                }
            });
        },
        function(ownerKey,callback) {
            client.get(ownerKey,function(err,res){
                if (err) return callback(err);
                var token = ownerKey.split(':')[1];
                var owner = meshbluHeader(res,token);
                callback(null, owner);
            });
        }
    ],
    function(err,results) {
        client.quit();
        if (err) return callback(err);
        callback(null,results);
    });
}

module.exports = {
    commandRegister: function(options) {
        var prefix = master,
            times = 1;
        createDevices(null,prefix,times,function(err){});
    },
    commandCreate: function(options) {
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
                    callback(null,prefix,times);
                }
            },
            function(prefix,times,callback) {
                getOwner(function(err,owner){
                    if (err) return callback(err);
                    createDevices(owner,prefix,times,callback);
                });
            }            
        ],
        function(err, results){
            if(err){
                console.log('error encountered: ' + err.message);
            }
        })
    },

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
            client.quit();
        });

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
                client.on("error", function (err) {
                    console.log("Error " + err);
                });
                
                client.quit();
            } else if (error) {
                console.log('Error: ' + error);
            }
        });
        */
    }/*,
    commandList: function(options) {

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
