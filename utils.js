var path = require('path'),
    Chance = require('chance'),
    chance = new Chance();

module.exports = {
    buildHeader: function(res) {
        return {
            meshblu_auth_uuid: res.uuid,
            meshblu_auth_token: res.token
        };
    },
    randomToken: function() {
        return chance.hash({length: 8})    
    },
    commandName: function(filename){
        var basename = path.basename(filename);
        return basename.substr(0, basename.lastIndexOf('.'));
    },
    requestOptions: function(command,headers,form){
        var options = {
            url: process.env.MESHBLU_URL + command ,
            agentOptions: {
                rejectUnauthorized: false
            }
        };
        
        if(headers){
            options.headers = headers;
        }
        if(form){
            options.form = form;
        }
        return options;
    }
};
