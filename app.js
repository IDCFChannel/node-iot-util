#!/usr/bin/env node

var program = require('commander')
  , status  = require('./commands/status.js')
  , devices = require('./commands/devices.js');

program
    .version('0.0.1')
    .usage('<command>');

program
    .command('status')
    .description('show status')
    .action(status.commandStatus);

program
    .command('devices')
    .description('post device')
    .option('--keyword <keyword>', 'device keyword')
    .option('--token [token]', 'token')
    .action(devices.commandDevices);

program.parse(process.argv);

if (process.argv.length < 2) {
    console.log('You must specify a command'.red);
    program.help();
}

exports.program = program;
