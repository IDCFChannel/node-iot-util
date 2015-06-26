var request = require('request'),
    redis = require('../initializers/redis'),
    utils = require('../utils');

module.exports = {
    commandStatus: function(options) {
        var options = utils.requestOptions('status');
        request.get(options,function(error, response, body) {
            if (!error && response.statusCode == 200){
                var body = JSON.parse(body);
                console.log(body);
            } else if (error) {
                console.log('Error: ' + error);
            }
            redis.quit();
        });
    }
}
