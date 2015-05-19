var request = require('request'),
    path = require('path');

module.exports = {
    commandStatus: function(symbol, command) {

        var filename = path.basename(__filename),
            cmd = filename.substr(0, filename.lastIndexOf('.'));

        var options = {
            url: process.env.MESHBLU_URL + cmd ,
            agentOptions: {
                rejectUnauthorized: false
            }
        }

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
