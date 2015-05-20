var request = require('request')
  , util = require('../util');

module.exports = {
    commandDevices: function(options) {

        var name = options.name || 'action-x';
        var token = options.token || 'token-x';
        var options = util.requestOptions(__filename,
                                          {name:name,
                                           token:token});

        console.log(name,token);
        return;
        request.post(options,function(error, response, body) {
            if (!error && response.statusCode == 201){
                var redis = require('redis'),
                    client = redis.createClient(process.env.REDIS_PORT,
                                              process.env.REDIS_HOST);
                var body = JSON.parse(body),
                    uuid = body.uuid,
                    key = body.name + ':' + body.token;
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
