/* eslint no-console: 0 */
'use strict';

var express         = require('express'),
    app             = express(),
    pkg             = require('./package.json'),
    bp              = require('body-parser'),
    expressSession  = require('express-session'),
    excon           = require('express-controller'),
    flash           = require('connect-flash'),
    router          = express.Router(),
    models          = require('./models'),
    utils           = require('./utils'),
    logger          = require('./logs'),
    path            = require('path'),
    moment          = require('moment'),
    bars            = require('express-handlebars');

// handlebars as templating engine
const hbs = bars.create({
  defaultLayout: 'default',
  extname: '.hbs',
  partialsDir: path.join(__dirname, 'views/partials'),
  layoutsDir: path.join(__dirname, 'views/layouts'),
  helpers: {
    groupPrefix: data => {
      var pre = (~['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].indexOf(data)) ? 'Group ' : '';
      return pre + data;
    },
    pluralise: (num, singular, plural = `${singular}s`) => {
      return (num !== 1) ? plural : singular;
    }
  }
});

// set some defaults for moment locale
moment.locale('en-GB');
moment.updateLocale('en-GB', {
  longDateFormat: {
    L: utils.ddateFormat // this is the (relative) date format used by moment.calendar()
  },
  // templates for relative time labels
  calendar: {
    sameDay: '[Today]',
    nextDay: '[Tomorrow]'
  }
});

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

// set static route
app.use(express.static(path.join(__dirname, 'assets')));
app.use('/assets/flags', express.static(path.join(__dirname, 'node_modules/flag-icon-css/')));

// body-parsing for post requests
app.use(bp.urlencoded({ 'extended': false }));
app.use(bp.json());

app.set('port', process.env.PORT || 1960); // a good year for yashin

// middleware
app.use(expressSession({
  secret: 'fgRdt2k8dw7eIw',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());
app.use((req, res, next) => {
  res.locals.flash_success = req.flash('success');
  res.locals.flash_error = req.flash('error');
  res.locals.flash_info = req.flash('info');
  res.locals.prod = process.env.YASHIN_PROD;
  res.locals.pkg = pkg;
  next();
});

// authentication using passport.js
require('./auth')(app);

// add routing
app.use(router);
require('./routes')(app);
excon.setDirectory(path.join(__dirname, 'controllers')).bind(router);

// final middleware to handle anything not matched by a route
app.use(function(req, res) {
  res.status(404).render('errors/404', {
    title: 'Uh-oh!'
  });
});

// set up sequelize and start server listening
models.sequelize.sync().then(function() {
  console.log(`----------| ${ pkg.name } started |----------`);
  console.log('database  : connected');
  const server = app.listen(app.get('port'), () => {
      console.log(`system up : ${ moment().format('DD MMM HH:mm:ss') } `);
      console.log(`port      : ${ app.get('port') }`);
      logger.info(`${ pkg.name } started`);
      console.log('---------------------------------------');
  });
  module.exports = server;
});
