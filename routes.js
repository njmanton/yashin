// jshint node: true, esversion: 6
'use strict';

const models    = require('./models'),
      moment    = require('moment'),
      emoji     = require('node-emoji'),
      marked    = require('marked'),
      fs        = require('fs'),
      utils     = require('./utils'),
      Promise   = require('bluebird'),
      passport  = require('passport');

// first day of tournament (month is 0-based...)
const start = [2018, 5, 14];

// routes.js
// all non-model based routes

const routes = app => {

  // home page
  app.get('/', (req, res) => {
    // calculate days until start of tournament
    const days = moment(start).diff(moment(), 'days') + 1;

    models.Match.current().then(matches => {
      res.render('main', {
        title: 'Goalmine 2018 World Cup',
        data: matches,
        days: days,
        scripts: ['/js/vendor/textition.js']
      });
    });
  });

  app.get('/home', utils.isAuthenticated, (req, res) => {
    const a = models.League.actions(req.user.id),
          p = models.User.predictions(req.user.id);

    Promise.join(p, a, (preds, actions) => {
      res.render('home', {
        title: `Goalmine | ${ req.user.username }`,
        preds: preds,
        actions: actions,
        scripts: ['/js/userleagues.js'],
        home: true,
      });
    });
  });

  // main leaderboard
  app.get('/leaderboard', (req, res) => {
    models.User.table().then(table => {
      res.render('leaderboard', {
        title: 'leaderboard',
        table: table,
      });
    });
  });

  // login
  app.get('/login', utils.isAnon, (req, res) => {
    res.render('players/login', {
      title: 'Login'
    });
  });

  app.post('/login',
    passport.authenticate('local', {
      successReturnToOrRedirect: '/home',
      failureRedirect: '/',
      failureFlash: true
    })
  );

  app.get('/auth/facebook',
    passport.authenticate('facebook', {
      //scope: ['email', 'photo']
    })
  );

  app.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
      successReturnToOrRedirect: '/home',
      //successRedirect: '/home',
      failureRedirect: '/',
      failureFlash: true
    })
  );

  app.get('/auth/google',
    passport.authenticate('google', {
      scope: ['profile']
    })
  );

  app.get('/auth/google/callback',
    passport.authenticate('google', {
      successReturnToOrRedirect: '/home',
      failureRedirect: '/',
      failureFlash: true
    })
  );

  app.get('/logout', (req, res) => {
    req.logout();
    req.flash('info', 'Logged Off');
    res.redirect('/');
  });

  // ajax route to emojify and markdown format submitted text, for previewing
  app.post('/preview', utils.isAjax, (req, res) => {
    res.send(emoji.emojify(marked(req.body.text)));
  });

  app.get('/pages/goaltime', (req, res) => {
    res.render('pages/goaltime', {
      title: 'Goals by time scored',
      scripts: ['https://code.highcharts.com/highcharts.js', 'https://code.highcharts.com/highcharts-more.js', '/js/goaltime.js']
    });
  });

  // any other static content
  app.get('/pages/:page', (req, res) => {
    let path = `views/pages/${ req.params.page }.hbs`;
    try {
      fs.accessSync(path, fs.F_OK);
      res.render(`pages/${ req.params.page }`, {
        title: req.params.page,
      });
    } catch (e) {
      res.status(404).render('errors/404', { layout: 'error', title: 'Uh-oh' });
    }
  });

};

module.exports = routes;
