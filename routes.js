// jshint node: true, esversion: 6
'use strict';

var models    = require('./models'),
    moment    = require('moment'),
    mail      = require('./mail'),
    emoji     = require('node-emoji'),
    marked    = require('marked'),
    fs        = require('fs'),
    utils     = require('./utils'),
    Promise   = require('bluebird'),
    chalk     = require('chalk'),
    passport  = require('passport');

// routes.js
// all non-model based routes

const routes = app => {

  // home page
  app.get('/', (req, res) => {
    res.render('main', {
      title: 'Welcome'
    });
  });

  app.get('/home', utils.isAuthenticated, (req, res) => {
    const m = models.User.missing(req.user.id),
          p = models.Pred.findAll({
            where: { user_id: req.user.id },
            include: {
              model: models.Match,
              attributes: ['id', 'date', 'result', 'group'],
              include: [{
                model: models.Team,
                as: 'TeamA',
                attributes: ['id', 'name', 'sname']
              }, {
                model: models.Team,
                as: 'TeamB',
                attributes: ['id', 'name', 'sname']
              }]
            }
          });

    Promise.join(p, m, (preds, missing) => {
      res.render('home', {
        title: 'Goalmine | ' + req.user.username,
        data: req.user,
        preds: preds,
        missing: missing,
        script: '/js/userleagues.js',
        home: true,
        debug: JSON.stringify([missing], null, 2)
      })
    })

  });

  // main leaderboard
  app.get('/leaderboard', (req, res) => {
    models.User.table().then(table => {
      res.render('leaderboard', {
        title: 'leaderboard',
        table: table
      })
    })
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

  // app.get('/auth/facebook', 
  //   passport.authenticate('facebook', {
  //     //scope: ['email', 'photo']
  //   })
  // );

  // app.get('/auth/facebook/callback', 
  //   passport.authenticate('facebook', {
  //     successRedirect: '/home',
  //     failureRedirect: '/'
  //   })
  // );

  // app.get('/auth/google', 
  //   passport.authenticate('google', {
  //     scope: ['profile']
  //   })
  // );

  // app.get('/auth/google/callback',
  //   passport.authenticate('google', {
  //     successRedirect: '/home',
  //     failureRedirect: '/',
  //     failureFlash: true
  //   })
  // );

  app.get('/logout', (req, res) => {
    req.logout();
    req.flash('info', 'Logged Off');
    res.redirect('/');
  });

  // ajax route to emojify and markdown format submitted text, for previewing
  app.post('/preview', utils.isAjax, (req, res) => {
    console.log(req.body);
    res.send(emoji.emojify(marked(req.body.text)));
  })

  // any other static content
  app.get('/pages/:page', (req, res) => {
    let path = `views/pages/${ req.params.page }.hbs`;
    try {
      fs.accessSync(path, fs.F_OK);
      res.render('pages/' + req.params.page, {
        title: req.params.page
      });      
    } catch (e) {
      res.status(404).render('errors/404', { layout: 'error', title: 'Uh-oh' });
    }
  });

};

module.exports = routes;
