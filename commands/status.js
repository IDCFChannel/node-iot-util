var request = require('request')
  , util = require('../util');

module.exports = {
    commandStatus: function(options) {

        var options = util.requestOptions(__filename);

        request.get(options,function(error, response, body) {
            if (!error && response.statusCode == 200){
                var body = JSON.parse(body);
                console.log(body);
            } else if (error) {
                console.log('Error: ' + error);
            }
        });
    }
}
