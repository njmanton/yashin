// jshint node: true, esversion: 6
'use strict';

let moment  = require('moment'),
      mail  = require('../mail'),
        ga  = require('group-array'),
     utils  = require('../utils'), 
         _  = require('lodash/orderBy');

const user = (sequelize, DataTypes) => {
  return sequelize.define('users', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '0'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '0'
    },
    facebook_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    google_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '0'
    },
    admin: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '0'
    },
    lastlogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    referredby: {
      type: DataTypes.INTEGER(6),
      allowNull: true
    },
    paid: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '0'
    },
    resetpwd: {
      type: DataTypes.STRING,
      allowNull: true
    },
    validated: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '0'
    }
  }, {
    classMethods: {
      table: () => {
        const models = require('.');

        return models.Pred.findAll({
          attributes: ['id', 'prediction', 'joker', 'points'],
          include: [{
            model: models.User,
            attributes: ['id', 'username', 'paid'],
            where: { validated: 1 }
          }, {
            model: models.Match,
            attributes: ['id', 'result', 'group', 'stage']
          }]
        }).then(preds => {
          var table = {};
          for (let x = 0; x < preds.length; x++) {
            if (preds[x].user) {
              var name = preds[x].user.username;
              if (!(name in table)) {
                table[name] = {
                  rank: 0,
                  name: name,
                  unpaid: !preds[x].user.paid,
                  uid: preds[x].user.id,
                  points: 0,
                  preds: 0,
                  cs: 0,
                  cd: 0,
                  cr: 0
                };
              }

              table[name].points += preds[x].points;
              switch (preds[x].points) {
                case 5:
                case 10:
                  table[name].cs++;
                  break;
                case 3:
                case 6:
                  table[name].cd++;
                  break;
                case 1:
                case 2:
                  table[name].cr++;
              }
              table[name].order = table[name].points + 
                                  (table[name].cs / 100) +
                                  (table[name].cd / 10000) +
                                  (table[name].cr / 1000000);         
            }
          }

          // sort the table
          var league = [];
          for (var prop in table) {
            league.push(table[prop]);
          }
          league = _(league, ['order'], ['desc']);
          let row = 0,
              rank = 1,
              prev = 0,
              dups = [];
          for (let x = 0; x < league.length; x++) {
            if (!league[x].unpaid) {
              if (league[x].order == prev) {
                row++;
                dups.push(league[x].order);
              } else {
                rank = ++row;
              }
              prev = league[x].order;
              league[x].rank = rank;              
            } else {
              league[x].rank = '-';
            }

          }
          for (let x = 0; x < league.length; x++) {
            if (~dups.indexOf(league[x].order)) {
              league[x].rank += '=';
            }
          }
          return league;
        });
      },

      predictions: uid => {

        const models = require('.');
        return models.Match.findAll({
          where: [{ teama_id: { ne: null } }, { teamb_id: { ne: null } }],
          attributes: ['id', 'result', 'date', 'group', 'stage'],
          order: 'stageorder DESC, id',
          include: [{
            model: models.Pred,
            attributes: ['id', 'joker', 'prediction', 'points'],
            where: { user_id: uid },
            required: false
          }, {
            model: models.Team,
            as: 'TeamA',
            attributes: ['id', 'name', 'sname', 'code']
          }, {
            model: models.Team,
            as: 'TeamB',
            attributes: ['id', 'name', 'sname', 'code']
          }, {
            model: models.Venue,
            attributes: ['id', 'stadium', 'city']
          }]
        }).then(matches => {
          let preds = [];
          for (var x = 0; x < matches.length; x++) {
            let m = matches[x];
            let pred = {
              mid: m.id,
              group: m.group,
              stage: m.stage,
              result: m.result,
              teama: {
                id: m.TeamA.id,
                name: m.TeamA.name,
                sname: m.TeamA.sname,
                code: m.TeamA.code
              },
              teamb: {
                id: m.TeamB.id,
                name: m.TeamB.name,
                sname: m.TeamB.sname,
                code: m.TeamB.code
              },
              venue: {
                id: m.venue.id,
                stadium: m.venue.stadium,
                city: m.venue.city
              }
            };
            if (m.predictions[0]) {
              pred.pid = m.predictions[0].id;
              pred.pred = m.predictions[0].prediction;
              pred.joker = m.predictions[0].joker || (m.id > 62); // 3 place and final are both joker games
              pred.pts = m.predictions[0].points;
            }
            let then = moment(m.date).subtract(1, 'h');
            pred.expired = moment().isAfter(then) || !!m.result;
            preds.push(pred);
          }
          return ga(preds, 'stage');
        });
      },

      invite: (body, referrer) => {
        // validate inputs: body.email, body.copy
        // get a temporary code

        if (!referrer || !body) { return false; }

        const code = utils.getTempName(8);
        const models = require('.');

        return models.User.create({
          username: code,
          email: body.email,
          password: code,
          referredby: referrer.id
        }).then(invite => {
          
          var template  = 'invite.hbs',
              subject   = 'Invitation',
              context   = {
                name: referrer.username,
                custom: body.message,
                email: referrer.email,
                code: code
              };

          var cc = (body.copy) ? referrer.email : null;
          return mail.send(invite.email, cc, subject, template, context, mail_result => {
            return [invite, mail_result];
          });

        });
      }, 

      // get missing predictions for given player
      missing: uid => {

        const models = require('.');

        var qry = `SELECT
          M.stage AS stage,
          COUNT(M.id) AS missing
          FROM matches M
          LEFT JOIN predictions P
          ON (P.match_id = M.id AND P.user_id = ?)
          WHERE (M.teama_id IS NOT NULL AND M.teamb_id IS NOT NULL AND P.user_id IS NULL)
          GROUP BY M.stage`;
        return models.sequelize.query(qry, { replacements: [uid], type: sequelize.QueryTypes.SELECT });
      }
    }
  }, {
    tableName: 'users',
    freezeTableName: true
  });
};

module.exports = user;

