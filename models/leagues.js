// jshint node: true, esversion: 6
'use strict';

const _  = require('lodash/orderBy');

const league = (sequelize, DataTypes) => {
  return sequelize.define('leagues', {
    id: {
      type: DataTypes.INTEGER(10),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    organiser: {
      type: DataTypes.INTEGER(10),
      allowNull: false
    },
    public: {
      type: DataTypes.INTEGER(10),
      allowNull: false,
      defaultValue: 0
    },
    confirmed: {
      type: DataTypes.INTEGER(10),
      allowNull: false,
      defaultValue: 0
    }
  }, {
    classMethods: {
      table: league => {
        const models = require('.');
        const qry = `SELECT
          P.id,
          P.joker,
          P.prediction,
          M.result,
          P.points,
          U.username,
          U.id AS uid
          FROM predictions P
          LEFT JOIN users U ON P.user_id = U.id
          LEFT JOIN league_user LU ON U.id = LU.user_id
          LEFT JOIN matches M ON P.match_id = M.id
          WHERE LU.league_id = ${ league } AND LU.confirmed = 1`;
        return models.sequelize.query(qry, { type: sequelize.QueryTypes.SELECT }).then(results => {
          var table = {};
          for (let x = 0; x < results.length; x++) {
            var name = results[x].username;
            if (!(name in table)) {
              table[name] = {
                name: name,
                uid: results[x].uid,
                points: 0,
                preds: 0,
                cs: 0,
                cd: 0,
                cr: 0
              };
            }

            table[name].points += results[x].points;
            switch (results[x].points) {
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
            if (league[x].order == prev) {
              row++;
              dups.push(league[x].order);
            } else {
              rank = ++row;
            }
            prev = league[x].order;
            league[x].rank = rank;
          }
          for (let x = 0; x < league.length; x++) {
            if (~dups.indexOf(league[x].order)) {
              league[x].rank += '=';
            }
          }
          return league;

        });
      },
      // this returns a list of all user leagues for which user needs to take action
      actions: uid => {
        const models = require('.');
        return models.League.findAll({
          where: { organiser: uid },
          attributes: ['id', 'name', [sequelize.fn('count', sequelize.col('name')), 'ac']],
          group: ['id', 'name'],
          include: {
            model: models.League_User,
            where: { confirmed: 0 },
            attributes: []
          }
        }).then(leagues => {
          return leagues;
        });
      }
    }
  }, {
    tableName: 'leagues',
    freezeTableName: true
  });
};

module.exports = league;
