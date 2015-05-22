var request = require('request'),
    utils = require('../utils'),
    Chance = require('chance'),
    chance = new Chance();

function randomToken() {
    return chance.hash({length: 8})    
}

module.exports = {
    commandDevices: function(options) {

        var keyword = options['keyword'];

        if (!keyword) {
            console.log('--keyword is required');
            return
        }
        
        var token = options.token || randomToken();

        var options = utils.requestOptions(__filename,
                                          {keyword:keyword,
                                           token:token});

        request.post(options,function(error, response, body) {
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

    }

}
