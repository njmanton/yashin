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
        const models = require('.'),
              moment = require('moment');

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
          let placeholders = [];
          if (match.id > 48) {
            placeholders = match.group.split('v');
          }
          if (match.TeamA == null) {
            match.TeamA = {
              id: 0,
              name: placeholders[0]
            }
          }
          if (match.TeamB == null) {
            match.TeamB = {
              id: 0,
              name: placeholders[1]
            }
          }
          return match;
        })
      }
    }
  }, {
    tableName: 'matches',
    freezeTableName: true
  });

};

module.exports = match;
