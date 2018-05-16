'use strict';

const models  = require('../models'),
      folder  = 'admin',
      mail    = require('../mail/'),
      logger  = require('winston'),
      Promise = require('bluebird'),
      utils   = require('../utils/');

const controller = {

  // handle a submitted match result
  post_result: [utils.isAdmin, function(req, res) {
    // req.body should be mid, result
    if (utils.validScore(req.body.result)) {

      models.Match.update({
        result: req.body.result
      }, {
        where: { id: req.body.mid }
      }).then(() => {
        logger.info(`match ${ req.body.mid } result updated to ${ req.body.result }`);
        const preds = models.Pred.findAll({
          where: { match_id: req.body.mid }
        });
        Promise.each(preds, pred => {
          const score = utils.calc(pred.prediction, req.body.result, pred.joker);
          pred.update({
            points: score
          });
        }).then(e => {
          req.flash('success', `Result set to ${ req.body.result }, updating ${ e.length } predictions`);
          res.redirect(`/matches/${ req.body.mid }`);
        });

      });

    } else {

      req.flash('error', 'The entered score was not valid');
      res.redirect(`/matches/${ req.body.mid }`);

    }
  }],

  // get a list of all players with payment status
  get_payment: [utils.isAdmin, function(req, res) {
    models.User.findAll({
      attributes: ['id', 'username', 'paid'],
      where: { validated: 1 }
    }).then(users => {
      res.render(`${ folder }/payment`, {
        title: 'Manage Payments',
        users: users,
      });
    });
  }],

  // update a payment made
  post_payment: [utils.isAjax, utils.isAdmin, function(req, res) {

    models.User.findById(req.body.payee).then(user => {
      if (user) {
        user.update({ paid: 1 }).then(upd => {
          if (upd) {
            logger.info(`payment confirmed for ${ user.username } (${ user.id })`);
            const subject = 'Goalmine 2018 Payment',
                  template = 'payment.hbs',
                  context = {
                    user: user.username
                  };
            mail.send(user.email, null, subject, template, context, mailresp => {
              if (mailresp) {
                res.status(200).send('email sent');
              } else {
                res.status(200).send('email not sent');
              }
            });
          } else {
            res.status(200).send('user not updated');
          }
        });
      } else {
        res.status(404).send('user not found');
      }
    });

  }],

  // make a decision on a new league request
  post_league_request: [utils.isAjax, utils.isAdmin, function(req, res) {
    // parameters lid and decision

    models.League.findById(req.body.lid, {
      include: {
        model: models.User,
        attributes: ['id', 'username', 'email']
      }
    }).then(league => {
      // league.user is in this case the organiser of the league
      if (league) {
        if (req.body.decision == 'A') {
          // accept, so update the league confirmed status and add the organiser to league_users
          const u = league.update({ confirmed: 1 }),
                c = models.League_User.create({
                  user_id: league.user.id,
                  league_id: league.id,
                  confirmed: 1
                });

          Promise.join(u, c, (update, league_user) => {
            if (update && league_user) {
              logger.info(`league ${ league.name } approved by ${ req.user.username }`);
              // email organiser
              const subject = 'Goalmine 2018 user league accepted',
                    template = 'league_create_yes.hbs',
                    context = {
                      user: league.user.username,
                      league: league.name,
                      id: league.id
                    };
              mail.send(league.user.email, null, subject, template, context, () => {
                res.send('accepted');
              });
            } else {
              res.send('error');
            }
          });
        } else if (req.body.decision == 'R') {
          // reject, so destroy the unconfirmed league
          league.destroy().then(league => {
            logger.info(`league ${ league.name } rejected by ${ req.user.username }`);
            const subject = 'Goalmine 2018 user league accepted',
                  template = 'league_create_no.hbs',
                  context = {
                    user: league.user.username,
                    league: league.name,
                    id: league.id
                  };

            mail.send(league.user.email, null, subject, template, context, () => {
              res.send('rejected');
            });

          });
        } else {
          res.send('error');
        }
      } else {
        res.status(404).render('errors/404');
      }

    });
  }],

  get_goals_id: [utils.isAdmin, function(req, res, id) {
    models.Match.findById(id, {
      where: { result: { ne: null } },
      attributes: [
        'id',
        'result',
        'date',
      ],
      include: [{
        model: models.Team,
        as: 'TeamA',
        attributes: ['id', 'name', 'sname']
      }, {
        model: models.Team,
        as: 'TeamB',
        attributes: ['id', 'name', 'sname']
      }, {
        model: models.Goal,
        attributes: ['id', 'team_id', 'scorer', 'type', 'time', 'tao'],
        include: {
          model: models.Team,
          attributes: ['id', 'name']
        }
      }]
    }).then(match => {
      if (match) {
        res.render(`${ folder }/goals`, {
          data: match,
          title: 'Manage Goals',
          //debug: JSON.stringify(match, null, 2)
        });
      } else {
        res.status(404).render('errors/404');
      }
    });
  }],

  post_goals_add: [utils.isAdmin, function(req, res) {
    if (!req.body.scorer || !req.body.team || req.body.time < 1 || req.body.time > 120) {
      req.flash('error', 'something wrong with that data');
      res.redirect(req.headers.referer);
    } else {
      models.Goal.create({
        match_id: req.body.match_id,
        team_id: req.body.team,
        scorer: req.body.scorer,
        time: req.body.time,
        tao: req.body.tao,
        type: req.body.type || null
      }).then(goal => {
        if (goal) {
          logger.info(`new goal added: ${ req.body.scorer } in match ${ req.body.team }`);
          req.flash('success', 'Goal added');
        } else {
          logger.error('Error adding goal to database');
          req.flash('error', 'Couldn\'t save data');
        }
        res.redirect(req.headers.referer);
      });
    }
  }],

  delete_goals_id: [utils.isAdmin, function(req, res, id) {
    models.Goal.destroy({
      where: { id: id }
    }).then(r => {
      res.send(r > 0);
    });
  }]

};

module.exports = controller;
