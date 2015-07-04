var path = require('path'),
    Chance = require('chance'),
    chance = new Chance(),
    _ = require('lodash'),
    Table = require('cli-table');

module.exports = {
    // constants
    master: 'owner',
    action: 'action',
    trigger: 'trigger',
    owners: 'owners',
    actions: 'actions',
    triggers: 'triggers',
        
    isDevice: function(keyword, label) {
        return _.startsWith(keyword, label)
    },

    isTrigger: function(keyword) {
        return this.isDevice(keyword, this.trigger);
    },

    isAction: function(keyword) {
        return this.isDevice(keyword, this.action);
    },

    isOwner: function(keyword) {
        return this.isDevice(keyword, this.master);
    },

    // helpers
    prettyTable: function(body, options) {
        var table = new Table(options);
        body.forEach(function(n) {
            table.push(n);
        });
        var retval = table.toString(); 
        return retval;
    },

    buildOwnerName: function(keyword, token) {
       return  this.owners+':'+keyword+':'+token;
    },
    
    destructKeyword: function(device) {
        if(_.isEmpty(device) || device.indexOf(':') < 0) {
            return device;
        } else {
            return device.split(':')[1];
        }
    },

    buildNamespace: function(keyword) {
        if(this.isTrigger(keyword)){
            return this.triggers;
        } else if (this.isAction(keyword)){
            return this.actions;
        } else {
            return null;
        }
    },

    buildDeviceName: function(keyword, ownerToken) {
        var namespace = this.buildNamespace(keyword);
        return namespace+':'+keyword+':'+ownerToken;
    },

    buildActionName: function(keyword, ownerToken) {
        return this.action+'-'+keyword.split('-')[1];
    },

    checkDevices: function(prefix) {
        return _.includes([this.action, this.trigger], prefix);
    },

    buildHeader: function(res) {
        return {
            meshblu_auth_uuid: res.uuid,
            meshblu_auth_token: res.token
        };
    },
    
    isWhiten: function(toDevice, fromUuid) {
        if (_.includes(toDevice.discoverWhitelist, fromUuid) ||
            _.includes(toDevice.receiveWhitelist, fromUuid) ) {
            return true;
        } else {
            return false;
        }        
    },

    buildBaseOptions: function(owner, prefix, n) {
        return {
            keyword: (!owner ? prefix : prefix+'-'+(n+1)),
            token: this.randomToken()
        };
    },

    buildWhiteToForm: function(toDevice, fromUuid) {
        var form = {
            discoverWhitelist: _.toArray(toDevice.discoverWhitelist),
            receiveWhitelist: _.toArray(toDevice.receiveWhitelist)
        };
        form.discoverWhitelist.push(fromUuid);
        form.receiveWhitelist.push(fromUuid);
        return form;
    },

    randomToken: function() {
        return chance.hash({length: 8})    
    },

    commandName: function(filename){
        var basename = path.basename(filename);
        return basename.substr(0, basename.lastIndexOf('.'));
    },

    requestOptions: function(command, headers, form){
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
