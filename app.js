#!/usr/bin/env node
'use strict';

var program = require('commander')
  , status  = require('./commands/statusCommand.js')
  , device = require('./commands/deviceCommand.js');

program
    .version('0.0.1')
    .usage('<command>');

program
    .command('status')
    .description('show status')
    .action(status.commandStatus);

program
    .command('owner')
    .description('show owner keyword and token')
    .action(device.commandOwner);

program
    .command('show')
    .description('show device keyword and token')
    .option('-k, --keyword [keyword]','device keyword')
    .action(device.commandShow);

program
    .command('register')
    .description('register device')
    .action(device.commandRegister);

program
    .command('whiten')
    .description('device whiten')
    .option('-f, --from [from device]','add whitelist from')
    .option('-t, --to [to device]','add whitelist to')
    .action(device.commandWhiten);

program
    .command('create')
    .description('create device')
    .option('-p, --prefix [prefix]','action or trigger')
    .option('-t, --times <n>','create times',parseInt)
    .action(device.commandCreate);

program
    .command('delete')
    .description('delete all devices')
    .option('-p, --prefix [prefix]','action or trigger')
    .action(device.commandDelete);

program
    .command('list')
    .description('list devices')
    .option('-l, --list','list devices')
    .option('-p, --prefix [prefix]','action or trigger or mythings')
    .action(device.commandList);

program.parse(process.argv);

if (process.argv.length < 2) {
    console.log('You must specify a command'.red);
    program.help();
}

exports.program = program;
