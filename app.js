#!/usr/bin/env node

var program = require('commander')
  , status  = require('./commands/status.js')
  , devices = require('./commands/devices.js');

program
    .version('0.0.1')
    .usage('<command>');

program
    .command('status')
    .option('-s, --status','Meshblu status')
    .description('show status')
    .action(status.commandStatus);

program
    .command('owner')
    .description('show owner keyword and token')
    .action(devices.commandOwner);

program
    .command('register')
    .description('register devices')
    .action(devices.commandRegister);

program
    .command('create')
    .description('create devices')
    .option('-p, --prefix [prefix]','action or trigger')
    .option('-t, --times <n>','create times',parseInt)
    .action(devices.commandCreate);

program
    .command('delete')
    .description('delete all devices')
    .option('-p, --prefix [prefix]','action or trigger')
    .action(devices.commandDelete);

program
    .command('list')
    .description('list devices')
    .option('-l, --list','list devices')
    .option('-p, --prefix [prefix]','action or trigger or mythings')
    .action(devices.commandList);

program.parse(process.argv);

if (process.argv.length < 2) {
    console.log('You must specify a command'.red);
    program.help();
}

exports.program = program;
