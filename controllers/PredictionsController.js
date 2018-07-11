// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      folder  = 'predictions',
      utils   = require('../utils'),
      logger  = require('winston'),
      Promise = require('bluebird'),
      moment  = require('moment');

const predictions = {

  get_index: [utils.isAuthenticated, function(req, res) {
    // requires logged-in user
    models.User.predictions(req.user.id).then(preds => {
      for (let group in preds) {
        if (!preds.hasOwnProperty(group)) continue;
        let group_expired = false;
        for (let x = 0; x < preds[group].length; x++) {
          if (preds[group][x].expired && preds[group][x].joker) {
            group_expired = true;
          }
          // disable joker for 3P play-off, ensure final is a joker
          if (group == '3P') {
            group_expired = true;
          }
          if (group == 'Final') {
            preds[group][x].joker = 1;
          }
          preds[group][x].group_expired = preds[group][x].expired || group_expired;
        }
      }
      res.render(`${ folder }/index`, {
        title: 'My Predictions',
        table: preds
      });
    });
  }],

  // handle a submitted prediction
  post_update: [utils.isAjax, utils.isAuthenticated, function(req, res) {
    // req.body.mid, req.body.uid, req.body.pred
    models.Match.findById(req.body.mid, { attributes: ['date'] }).then(match => {

      let deadline = moment(match.date).subtract(1, 'h');
      if (moment().isAfter(deadline) || match.result) {
        res.sendStatus(403);
      } else if (!req.body.pred.match(/^\b\d{1,2}-\d{1,2}\b$/)) {
        res.status(400).send('Incorrect format');
      } else {
        models.Pred.findOne({
          where: { user_id: req.user.id, match_id: req.body.mid }
        }).then(pred => {
          if (pred) {
            pred.update({ prediction: req.body.pred }).then(() => { res.send('updated'); });
          } else {
            models.Pred.create({
              user_id: req.user.id,
              match_id: req.body.mid,
              prediction: req.body.pred
            }).then(() => { res.status(200).send({ updates: 1 }); });
          }
          logger.info(`user ${ req.user.username } set prediction ${ req.body.pred } on match ${ req.body.mid }`);
        }).catch(e => {
          logger.error(e);
          res.status(400).send('unable to save');
        });

      }
    });
  }],

  // handle the joker being set
  post_joker: [utils.isAjax, utils.isAuthenticated, function(req, res) {
    // req.body.mid, req.body.stage
    //res.send([req.body.mid, req.body.stage]);
    if (req.user && req.body.stage && req.body.mid) {
      models.Pred.findAll({
        where: { user_id: req.user.id },
        include: {
          model: models.Match,
          attributes: ['id', 'date'],
          where: { stage: req.body.stage },
          order: [['date', 'asc']]
        }
      }).then(preds => {
        let group_expired = false,
            upds = 0;
        Promise.each(preds, pred => {
          const deadline = moment(pred.match.date).subtract(1, 'h'),
                expired = moment().isAfter(deadline);

          // jokers cannot be changed if the existing joker match is on an expired match
          group_expired |= (expired && pred.joker == 1);
          // only update the joker if the match is still live _and_ the joker for that group hasn't yet expired
          // set the joker to be the match in question and unset jokers for other games in that group
          if (!expired && !group_expired) {
            upds++;
            pred.update({
              joker: (req.body.mid == pred.match_id)
            });
          }
        }).then(() => {
          logger.info(`user ${ req.user.username } set joker on match ${ req.body.mid } for stage ${ req.body.stage }`);
          res.send({ updates: upds });
        });
      });
    } else {
      res.send(false);
    }
  }]
};

module.exports = predictions;
