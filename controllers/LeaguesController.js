// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      folder  = 'leagues',
      moment  = require('moment'),
      mail    = require('../mail/'),
      Promise = require('bluebird'),
      logger  = require('winston'),
      utils   = require('../utils'),
      _       = require('lodash/findIndex'),
      cfg     = require('../config');

const controller = {

  get_index: function(req, res) {
    // get all confirmed leagues
    const confirmed = models.League.findAll({ 
      where: { confirmed: 1 },
      attributes: ['id', 'name', 'description', 'public'],
      include: [{
        model: models.User,
        attributes: ['id', 'username']
      }]
    });
    let pending = null;
    if (req.user && req.user.admin) {
      pending = models.League.findAll({ 
        where: { confirmed: 0 },
        attributes: ['id', 'name', 'description', 'public'],
        include: [{
          model: models.User,
          attributes: ['id', 'username']
        }]        
      })
    }
    Promise.join(confirmed, pending, (c, p) => {
      res.render(folder + '/index', {
        title: 'User Leagues',
        confirmed: c,
        pending: p,
        //debug: JSON.stringify([c,p], null, 2)
      })
    })
  },

  get_id: function(req, res, id) {

    const l = models.League.findById(id, {
      include: {
        model: models.User,
        attributes: ['id', 'username']
      }
    });
    const t = models.League.table(id);
    const p = models.League_User.findAll({
      where: [{ league_id: id }, { confirmed: 0 }],
      include: {
        model: models.User,
        attributes: ['id','username']
      }
    });
    Promise.join(l, t, p, (league, table, pending) => {
      if (league) {
        const uid = (req.user) ? req.user.id : 0;
        const user = {
          id: uid,
          owner: (req.user && ((req.user.id == league.organiser) || req.user.admin)),
          unconfirmed: ~_(pending, { user_id: uid }),
          member: (~_(table, { uid: uid }))
        }

        table.map(p => { p.sel = (p.uid == uid); });

        res.render(folder + '/view', {
          title: 'Goalmine | ' + league.name,
          league: league,
          table: table,
          pending: pending,
          usr: user,
          //debug: JSON.stringify([user, pending], null, 2)
        })        
      } else {
        res.status(404).render('errors/404');
      }

    })
  },

  // render form to request a new league
  get_add: [utils.isAuthenticated, function(req, res) {
    res.render(folder + '/add', {
      title: 'request new league'
    })
  }],

  // handle request for new league
  post_add: [utils.isAuthenticated, function(req, res) {
    // need name, desc, public
    if (req.body.name && req.body.desc) {
      const pub = (req.body.public == 'on');
      models.League.create({
        name: req.body.name,
        description: req.body.desc,
        public: pub || 0,
        confirmed: 0,
        organiser: (req.user) ? req.user.id : 0
      }).then(league => {
        if (league) {
          req.flash('success', 'Thank you, your request has been successfully submitted');
          logger.info(`League ${ req.body.name } has been requested by ${ req.user.username }`);
        } else {
          req.flash('error', 'Sorry, there was a problem submitting that request.');
        }
        res.redirect('/leagues');
      })
    } else {
      req.flash('error', 'you must complete both the title and description of the proposed league');
      res.redirect('/leagues/add');
    }
  }],

  // handle request to leave a user league
  delete_id_user: [utils.isAuthenticated, function(req, res, id) {
    if (!req.user) {
      res.send(false);
    } else {
      // check if person is organiser or only person in the league?
      models.League_User.destroy({
        where: { user_id: req.user.id, league_id: id }
      }).then(d => {
        req.flash('info', 'You are no longer a member of this league');
        res.send(true);
      })
    }
  }],

  // handle a request to join a private league
  put_id_join: [utils.isAuthenticated, function(req, res, id) {
    console.log('put request fired for league ' + id );
    models.League.findById(id, {
      attributes: ['id', 'name', 'public'],
      include: {
        model: models.User,
        attributes: ['id', 'username', 'email']
      }
    }).then(league => {
      models.League_User.create({
        user_id: req.user.id,
        league_id: league.id,
        confirmed: league.public
      }).then(lu => {
        if (league && league.public) {
          req.flash('success', 'you are now a member of this league');
        } else {
          // email organiser
          const template = 'league_join.hbs',
                subject = 'Goalmine League request',
                context = {
                  organiser: league.user.username,
                  user: req.user.username,
                  league: league.name,
                  id: league.id
                };
          mail.send(league.user.email, false, subject, template, context, done => {
            logger.info(`join request email for league ${ id } sent to ${ req.user.username }`);
          });
          req.flash('info', 'thank you, your join request has been forwarded to the league organiser');
        }
        res.send(true);
      })
    })

  }],

  // handle a join user league decision
  post_id_decision: [utils.isAuthenticated, function(req, res, id) {

    const dec = req.body.decision;
    models.League_User.findOne({
      where: { user_id: req.body.uid, league_id: id, confirmed: 0 },
      include: [{
        model: models.User,
        attributes: ['id', 'username', 'email']
      }, {
        model: models.League,
        attributes: ['id', 'name']
      }]
    }).then(lu => {
      if (lu) {
        // email requester
        const subject = 'World Cup Goalmine user league request';
        let context = {
          user: lu.user.username,
          league: lu.league.name,
          id: lu.league_id
        }
        if (dec == 'A') {
          let template = 'league_join_yes.hbs';
          lu.update({ confirmed: 1 }).then(ret => {
            mail.send(lu.user.email, null, subject, template, context, done => {
              logger.info(`${ lu.user.username } confirmed as member of league ${ lu.league_id } by ${ req.user.username }`);
              res.send(!(done.hasOwnProperty('errno'))); // email not sent if done object has an errno member
            });
          })
        } else if (dec == 'R') {
          let template = 'league_join_no.hbs';
          lu.destroy().then(ret => {
            mail.send(lu.user.email, null, subject, template, context, done => {
              logger.info(`${ lu.user.username } rejected as member of league ${ lu.league_id } by ${ req.user.username }`);
              res.send(!(done.hasOwnProperty('errno')));
            })
          })
        }
      } else {
        req.flash('error', `Couldn't find a pending request with those details`);
        res.redirect('/leagues/' + id);
      }
    })
  }]




}

module.exports = controller;