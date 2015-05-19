#!/usr/bin/env node

var program = require('commander')
  , status = require('./commands/status.js');

program
    .version('0.0.1')
    .usage('<command>');

program
    .command('status')
    .description('show status')
    .action(status.commandStatus);

program.parse(process.argv);

if (process.argv.length < 2) {
    console.log('You must specify a command'.red);
    program.help();
}

exports.program = program;
