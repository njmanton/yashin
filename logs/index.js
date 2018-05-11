// jshint node: true, esversion: 6
'use strict';

const winston = require('winston');

winston.remove(winston.transports.Console);
winston.add(winston.transports.File, {
  name: 'info-log',
  filename: './logs/progress.log',
  level: 'info',
  timestamp: true
});
winston.add(winston.transports.File, {
  name: 'error-log',
  filename: './logs/errors.log',
  level: 'error',
  timestamp: true
});

module.exports = winston;