var request = require('request'),
    utils = require('../utils'),
    Chance = require('chance'),
    chance = new Chance(),
    async = require('async');

function randomToken() {
    return chance.hash({length: 8})    
}

function sendPost(keyword,token){


}

module.exports = {
    commandDevices: function(options) {

        var prefix = options.prefix;

        if (!prefix || ['action','trigger','mythings'].indexOf(prefix) < 0) {
            console.log('--prefix must be action or trigger or mythings');
            return;
        }

        var times = options.times;
        if(isNaN(times) || times < 1){
            console.log('--times must be > 0');
            return;
        }

        async.timesSeries(times, function(n, callback) {
            var keyword = prefix + '-' + (n+1);

            var token = randomToken();
            var httpOptions = utils.requestOptions(__filename,
                                              {keyword:keyword,
                                               token:token});
            
            request.post(httpOptions,function(error, response, body) {
                if (!error && response.statusCode == 201){
                    var redis = require('redis'),
                        client = redis.createClient(process.env.REDIS_PORT,
                                                  process.env.REDIS_HOST);
                    var body = JSON.parse(body),
                        uuid = body.uuid,
                        key = body.keyword + ':' + body.token;
                    client.on("error", function (err) {
                        console.log("Error " + err);
                    });
                    client.set(key, uuid);
                    console.log(key + '=' + uuid);
                    client.quit();
                } else if (error) {
                    console.log('Error: ' + error);
                }
            });

            callback(null);
        });

    }

}
