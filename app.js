#!/usr/bin/env node
'use strict';

var program = require('commander'),
    redis = require('redis'),
    client = redis.createClient(process.env.REDIS_PORT_6379_TCP_PORT,
                                process.env.REDIS_PORT_6379_TCP_ADDR, {
                                    "connection_timeout": 1.0
                                }),
    device = require('./initializers/device')(client),
    deviceCommand = require('./commands/deviceCommand')(device),
    statusCommand = require('./commands/statusCommand'),
    prompt = require('prompt');

function end(err, res) {
    device.quit();
    if(err) console.log(err.message);
    else if (res) console.log(res);
}

program
    .version('0.0.1')
    .usage('<command>');

program
    .command('status')
    .description('show status')
    .action(function() {
        statusCommand.status(end);
    });

program
    .command('owner')
    .description('show owner keyword and token')
    .action(function() {
        deviceCommand.owner(end);
    });

program
    .command('show')
    .description('show device keyword and token')
    .option('-k, --keyword [keyword]','device keyword')
    .action(function(options) {
        deviceCommand.show(options, end);
    });

program
    .command('register')
    .description('register device')
    .action(function(options) {
        deviceCommand.register(options, end);
    });

program
    .command('whiten')
    .description('device whiten')
    .option('-f, --from [from device]','add whitelist from')
    .option('-t, --to [to device]','add whitelist to')
    .action(function(options) {
        deviceCommand.whiten(options, end);
    });

program
    .command('del')
    .description('del all devices')
    .action(function() {        
        prompt.start();
        prompt.message = 'are you sure?';
        prompt.get([{
            name: 'ok',
            type: 'string',
            pattern: /^[Yn]$/,
            description: '[Yn]',
            required: true
        }], function (err, result) {
            if(result && result.ok === 'Y') {
                deviceCommand.del(end);
            } else {
                process.exit();
            }
        });
    });

program
    .command('list')
    .description('list devices')    
    .option('-p, --prefix [prefix]','action or trigger or mythings')
    .action(function(options) {
        deviceCommand.list(options, end);
    });

program.parse(process.argv);

if (process.argv.length < 2) {
    console.log('You must specify a command');
    program.help();
}

exports.program = program;
