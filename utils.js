var path = require('path');

function commandName(filename){
    var basename = path.basename(filename);
    return basename.substr(0, basename.lastIndexOf('.'));
}

function requestOptions(command,headers,form){
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

module.exports = {
    requestOptions: requestOptions
};
