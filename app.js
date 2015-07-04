#!/usr/bin/env node
'use strict';

var program = require('commander'),
    statusCommand  = require('./commands/statusCommand'),
    redis = require('redis'),
    client = redis.createClient(process.env.REDIS_PORT_6379_TCP_PORT,
                                process.env.REDIS_PORT_6379_TCP_ADDR, {
                                    "connection_timeout": 1.0
                                }),
    device = require('./initializers/device')(client),
    deviceCommand = require('./commands/deviceCommand')(device);

program
    .version('0.0.1')
    .usage('<command>');

program
    .command('status')
    .description('show status')
    .action(statusCommand.status);

program
    .command('owner')
    .description('show owner keyword and token')
    .action(deviceCommand.owner);

program
    .command('show')
    .description('show device keyword and token')
    .option('-k, --keyword [keyword]','device keyword')
    .action(deviceCommand.show);

program
    .command('register')
    .description('register device')
    .action(deviceCommand.register);

program
    .command('whiten')
    .description('device whiten')
    .option('-f, --from [from device]','add whitelist from')
    .option('-t, --to [to device]','add whitelist to')
    .action(deviceCommand.whiten);

program
    .command('del')
    .description('del all devices')
    .action(deviceCommand.del);

program
    .command('list')
    .description('list devices')
    .option('-p, --prefix [prefix]','action or trigger or mythings')
    .action(deviceCommand.list);

program.parse(process.argv);

if (process.argv.length < 2) {
    console.log('You must specify a command');
    program.help();
}

exports.program = program;
