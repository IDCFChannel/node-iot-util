'use strict';

var request = require('request'),
    utils = require('../utils');

function _status(callback) {
    var options = utils.requestOptions('status');
    request.get(options, function(error, response, body) {
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
    _status: _status,
    status: function() {        
        _status(function(err, res){
            if(err) console.log(err);
            else console.log(res);
        });
    }
}
