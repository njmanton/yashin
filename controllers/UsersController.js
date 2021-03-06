'use strict';

const models    = require('../models'),
      bCrypt    = require('bcrypt-nodejs'),
      folder    = 'players',
      utils     = require('../utils'),
      Promise   = require('bluebird'),
      logger    = require('winston'),
      mail      = require('../mail/'),
      moment    = require('moment');

const controller = {

  get_index: function(req, res) {
    models.User.table().then(table => {
      res.render('leaderboard', {
        title: 'leaderboard',
        table: table
      });
    });
  },

  get_id: function(req, res, id) {
    // show details for selected player. If logged in player = selected player, redirect to /home.
    if (req.user && req.user.id == id) {
      res.redirect('/home');
    } else {
      const u = models.User.findById(id, {
              where: { validated: 1 },
              attributes: ['id', 'username', 'email', 'facebook_id', 'google_id']
            }),
            p = models.User.predictions(id);

      Promise.join(u, p, (user, preds) => {
        if (user && user.id) {
          res.render(`${ folder }/view`, {
            title: user.username,
            player: user,
            preds: preds,
            debug: JSON.stringify(preds, null, 2)
          });
        } else {
          res.status(404).render('errors/404');
        }
      });
    }
  },

  get_invite: [utils.isAuthenticated, function(req, res) {
    // requires loged in user
    let inviter = req.user ? req.user.id : 0;
    models.User.findAll({
      where: { referredby: inviter },
      attributes: ['email', 'validated', 'username', 'id']
    }).then(invitees => {
      res.render(`${ folder }/invite`, {
        title: 'Invite a friend',
        list: invitees
      });
    });

  }],

  post_invite: [utils.isAuthenticated, function(req, res) {
    // validate form fields
    // post format { email: <invitee email>, message: <message to send>, copy: <add inviter to cc>}
    models.User.invite(req.body, req.user).then(inv => {
      req.flash('info', `invitation sent to ${ inv.email }`);
      res.redirect('/home');
    }).catch(e => {
      logger.error(`error processing invitation: ${ e }`);
      req.flash('error', 'Sorry, that request could not be processed');
      res.redirect('/');
    });
  }],

  get_confirm_id: [utils.isAnon, function(req, res, id) {
    models.User.findOne({
      attributes: ['id', 'username', 'email'],
      where: { username: id, password: id },
      include: {
        model: models.User,
        as: 'Referrer',
        attributes: ['id', 'username', 'email']
      }
    }).then(user => {
      if (!user) {
        req.flash('error', `Sorry, the activation code (${ id }) was not recognised. Please check and try again`);
        res.redirect('/');
      } else {
        res.render(`${ folder }/confirm`, {
          title: 'Confirm Account',
          data: user
        });
      }
    });
  }],

  post_confirm: function(req, res) {
    // process new user
    // TODO validation
    // post format { username: <requested username>, email: <email>, password: <password>, repeat: <password again>, code: <validation code> }
    let valid = true;
    if (!req.body.username || req.body.username.length > 25) valid = false;
    if (!req.body.email) valid = false;
    if (!req.body.password || req.body.password.length < 8) valid = false;
    if (!req.body.repeat || req.body.password != req.body.repeat) valid = false;

    if (valid) {
      models.User.update({
        username: req.body.username,
        password: bCrypt.hashSync(req.body.password, bCrypt.genSaltSync(10), null),
        validated: 1,
        email: req.body.email
      }, {
        where: { username: req.body.code }
      }).then(user => {
        if (user) {
          req.flash('success', 'Thank you, your account is now verified. You can now log in below');
          res.redirect('/login');
        } else {
          req.flash('error', 'Sorry, there was a problem confirming that user account. Please try again.');
          res.redirect(`/users/confirm/${ req.body.code }`);
        }
      }).catch(err => {
        logger.error(err);
      });
    } else {
      req.flash('error', 'Sorry, there was a problem validating those details. Please try again');
      res.redirect(req.body.referer);
    }

  },

  get_available_username: [utils.isAjax, function(req, res, username) {
    // checks whether typed username in users/confirm is available
    models.User.findOne({
      where: { username: username }
    }).then(found => {
      res.send(found === null);
    });
  }],

  get_forgot: function(req, res) {
    // requires anon user
    if (req.user) {
      res.redirect('/home');
    } else {
      res.render(`${ folder }/forgot`);
    }
  },

  post_forgot: function(req, res) {
    // validate form fields
    // if username and email exist, reset password
    // post format { username: <username>, email: <email> }
    models.User.findOne({
      where: [{ username: req.body.username }, { email: req.body.email }]
    }).then(user => {
      if (user) {
        const reset = utils.getTempName(16),
              now = moment().format('ddd DD MMM, HH:mm');
        user.resetpwd = reset;
        user.save().then(() => {
          const template = 'reset_request.hbs',
                subject = 'Password reset request',
                context = {
                  name: req.body.username,
                  reset: reset,
                  date: now
                };

          mail.send(req.body.email, null, subject, template, context, () => {
            logger.info(`Password reset issued for ${ req.body.username }`);
          });
        }).catch(err => {
          logger.error(err);
        });
      }
      req.flash('info', 'Thank you. If those details were found, you will shortly receive an email explaining how to reset your password');
      res.redirect('/');
    });

  },

  get_missing: [utils.isAjax, function(req, res) {
    if (req.user) {
      models.User.missing(req.user.id).then(missing => {
        res.send(missing);
      });
    } else {
      res.send(403).render('errors/403');
    }

  }],

  // gets a list of required actions for the logged-in user
  //get_actions: [utils.isAjax, utils.isAuthenticated, function(req, res) {
  get_actions_id: [utils.isAjax, function(req, res, id) {
    const uid = id;
    models.League_User.findAll({
      where: { confirmed: 0 },
      attributes: [],
      include: {
        model: models.League,
        where: { organiser: uid },
        attributes: ['id', 'name']
      }
    }).then(leagues => {
      res.send(leagues);
    });
  }],

  get_reset_id: function(req, res, id) {
    models.User.findOne({
      where: { resetpwd: id },
      attributes: ['username', 'email', 'resetpwd']
    }).then(user => {
      if (!user) {
        req.flash('error', 'Sorry, that code wasn\'t recognised. Please check and try again');
        res.redirect('/');
      } else {
        res.render(`${ folder }/reset`, {
          title: 'Reset Password',
          usr: user,
          scripts: ['/js/resetform.js']
        });
      }
    });
  },

  // handle a password reset request
  post_reset: function(req, res) {
    // req.body = { email, code, pwd, rpt }
    models.User.findOne({
      where: { resetpwd: req.body.code, email: req.body.email }
    }).then(user => {
      // check there's a user with that reset code and email, and don't rely on
      // javascript to enforce password length
      if (user && (req.body.pwd.length > 7) && (req.body.pwd == req.body.rpt)) {
        user.update({
          password: bCrypt.hashSync(req.body.rpt, bCrypt.genSaltSync(10), null),
          resetpwd: null
        }).then(upd => {
          if (upd) {
            req.flash('success', 'Your password has been updated. You can now log in');
            logger.info(`reset password for ${ user.username }`);
          } else {
            logger.error(`Could not update password for ${ user.username }`);
            req.flash('error', 'Sorry, unable to update that account. Please try again later.');
          }
          res.redirect('/');
        });
      } else {
        req.flash('error', 'Sorry, those details were not valid');
        res.redirect('/');
      }
    });

  },

  get_id_leagues: [utils.isAjax, function(req, res, id) {
    // send a list of leagues of which the user is a member
    models.League_User.findAll({
      attributes: ['id', 'confirmed'],
      where: { user_id: id },
      include: {
        model: models.League,
        attributes: ['id', 'name', 'public', 'confirmed']
      }
    }).then(leagues => {
      if (leagues) {
        res.send(leagues);
      } else {
        res.send(null);
      }
    });
  }],
};

module.exports = controller;
