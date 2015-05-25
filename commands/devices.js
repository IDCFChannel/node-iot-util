var request = require('request'),
    utils = require('../utils'),
    Chance = require('chance'),
    chance = new Chance(),
    async = require('async'),
    redis = require('redis'),
    client = redis.createClient(process.env.REDIS_PORT,
                              process.env.REDIS_HOST),
    master = 'mythings';


function randomToken() {
    return chance.hash({length: 8})    
}

function validateDevices(prefix) {
    return (prefix && ['action','trigger'].indexOf(prefix) > -1)
}

function validatePrefix(prefix) {
    if (!validateDevices(prefix)){
        console.log('--prefix must be action or trigger');
        process.exit(0);
    } else {
        return true;
    }
}

function createDevices(prefix,times){

    async.timesSeries(times, function(n, callback) {

        var keyword = prefix;
        if (prefix != master){
            keyword = keyword.concat('-').concat(n+1);
        }

        var token = randomToken();
        var httpOptions = utils.requestOptions(__filename,
                                               {keyword:keyword,
                                                token:token});

        request.post(httpOptions,function(error, response, body) {
            if (!error && response.statusCode == 201){

                var body = JSON.parse(body),
                uuid = body.uuid,
                key = body.keyword + ':' + body.token;

                client.on("error", function (err) {
                    console.log("Error " + err);
                });

                client.set(key,uuid);
                console.log(key + '=' + uuid);
                client.quit();
            } else if (error) {
                console.log('Error: ' + error);
            }
        });
        
        callback(null);
    });
    return true;
}

function getOwner(){
    client.keys(master.concat(':*'),function(err,res){
        if(err) throw err;
        var owner = res[0].split(':');
        if(!owner){
            console.log("master user not found");
            process.exit(0);
            client.quit()
        }
        return owner;
    });
}

module.exports = {
    commandRegister: function(options) {
        var prefix = master,
            times = 1;
        createDevices(prefix,times);
    },
    commandCreate: function(options) {

        //var owner = getOwner();
        var prefix = options.prefix;

        if (!validatePrefix(prefix)) return;

        var times = options.times;
        if(isNaN(times) || times < 1){
            console.log('--times must be > 0');
            return;
        }
        createDevices(prefix,times);
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
    },
    commandList: function(options) {

        var prefix = options.prefix;
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
}
