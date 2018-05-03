// jshint node: true, esversion: 6
'use strict';

var express         = require('express'),
    app             = express(),
    pkg             = require('./package.json'),
    bp              = require('body-parser'),
    expressSession  = require('express-session'),
    os              = require('os'),
    excon           = require('express-controller'),
    flash           = require('connect-flash'),
    router          = express.Router(),
    models          = require('./models'),
    logger          = require('./logs'),
    moment          = require('moment'),
    bars            = require('express-handlebars');

// handlebars as templating engine
const hbs = bars.create({
  defaultLayout: 'default',
  extname: '.hbs',
  helpers: {
    groupPrefix: data => {
      var pre = (~['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].indexOf(data)) ? 'Group ' : '';
      return pre + data;      
    }
  }
});

moment.locale('en-GB');

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');

// set static route
app.use(express.static('assets'));
app.use('/assets/flags', express.static(__dirname + '/node_modules/flag-icon-css/'));

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
  res.locals.dev = process.env.YASHIN_DEV || false;
  res.locals.pkg = pkg;
  next();
});

// authentication using passport.js
require('./auth')(app);

// add routing
app.use(router);
require('./routes')(app);
excon.setDirectory(__dirname + '/controllers').bind(router);

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
      console.log(`system up : ${ moment().format('DD MMM HH:mm:ss') } `)
      console.log(`port      : ${ app.get('port') }`);
      logger.info(`${ pkg.name } started`);
      console.log(`---------------------------------------`);
  });
});

