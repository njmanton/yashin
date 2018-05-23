// jshint node: true, esversion: 6
'use strict';

const match = (sequelize, DataTypes) => {
  return sequelize.define('matches', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    teama_id: {
      type: DataTypes.INTEGER(4),
      allowNull: true
    },
    teamb_id: {
      type: DataTypes.INTEGER(4),
      allowNull: true
    },
    result: {
      type: DataTypes.STRING,
      allowNull: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    winmethod: {
      type: DataTypes.INTEGER(4),
      allowNull: true
    },
    venue_id: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    group: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '0'
    },
    stage: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '0'
    },
    stageorder: {
      type: DataTypes.INTEGER(4),
      allowNull: false
    }
  }, {
    classMethods: {
      details: mid => {
        const models = require('.');

        return models.Match.findById(mid, {
          attributes: ['id', 'result', 'date', 'group', 'stage', 'stageorder', 'winmethod'],
          include: [{
            model: models.Team,
            as: 'TeamA',
            attributes: ['id', 'name', 'sname']
          }, {
            model: models.Team,
            as: 'TeamB',
            attributes: ['id', 'name', 'sname']
          }, {
            model: models.Venue,
            attributes: ['id', 'stadium', 'city', 'capacity']
          }]
        }).then(match => {
          if (match == null) return null;
          let placeholders = [];
          if (match.id > 48) {
            placeholders = match.group.split('v');
          }
          if (match.TeamA == null) {
            match.TeamA = {
              id: 0,
              name: placeholders[0]
            };
          }
          if (match.TeamB == null) {
            match.TeamB = {
              id: 0,
              name: placeholders[1]
            };
          }
          return match;
        });
      },

      current: () => {
        // find the matches for the closest two days to now
        // using raw sql to handle the date manipulation and ugly join as normal subquery with limit clause not supported in mysql
        const models = require('.'),
              ga     = require('group-array'),
              moment = require('moment');

        const sql = `SELECT M.id, M.date, M.result, A.name as home, A.sname as aflag, B.name AS away, B.sname AS bflag, M.group, M.stage FROM matches AS M 
        LEFT JOIN teams AS A ON M.teama_id = A.id
        LEFT JOIN teams AS B ON M.teamb_id = B.id
        INNER JOIN
        (SELECT DISTINCT date(date) AS d FROM matches AS M WHERE M.date >= '${ moment().format('YYYY-MM-DD') }'
        ORDER BY date(date) ASC LIMIT 2) AS dts
        ON dts.d = date(M.date)`;
        return models.sequelize.query(sql, { type: sequelize.QueryTypes.SELECT }).then(matches => {
          // convert dates into 'tomorrow', 'next Tuesday' etc. then group by date
          matches.map(match => {
            const placeholders = match.group.split('v');
            match.time = moment(match.date).format('ha');
            match.date = moment(match.date).calendar();
            if (match.home == null) match.home = placeholders[0];
            if (match.away == null) match.away = placeholders[1];
          });
          return ga(matches, 'date');
        });

      }
    }
  }, {
    tableName: 'matches',
    freezeTableName: true
  });

};

module.exports = match;
