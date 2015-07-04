var request = require('request'),
    redis = require('../initializers/redis'),
    utils = require('../utils');

function _commandStatus(callback) {
    var options = utils.requestOptions('status');
    request.get(options, function(error, response, body) {
        redis.quit();        
        if (!error && response.statusCode == 200){
            var body = JSON.parse(body);
            var head = ['meshblu']
            var retval = utils.prettyTable([[body.meshblu]],
                                         {head: head});
            callback(null, retval);
        } else if (error) {
            callback(new Error(error));
        }
    });
}

module.exports = {
    _commandStatus: _commandStatus,
    commandStatus: function() {        
        _commandStatus(function(err, res){
            if(err) console.log(err);
            else console.log(res);
        });
    }
}
