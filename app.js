#!/usr/bin/env node
'use strict';

var program = require('commander')
  , statusCommand  = require('./commands/statusCommand.js')
  , deviceCommand = require('./commands/deviceCommand.js');

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
    .command('create')
    .description('create device')
    .option('-p, --prefix [prefix]','action or trigger')
    .option('-t, --times <n>','create times',parseInt)
    .action(deviceCommand.create);

program
    .command('delete')
    .description('delete all devices')
    .option('-p, --prefix [prefix]','action or trigger')
    .action(deviceCommand.remove);

program
    .command('list')
    .description('list devices')
    .option('-p, --prefix [prefix]','action or trigger or mythings')
    .action(deviceCommand.list);

program.parse(process.argv);

if (process.argv.length < 2) {
    console.log('You must specify a command'.red);
    program.help();
}

exports.program = program;
