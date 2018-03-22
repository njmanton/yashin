// jshint node: true, esversion: 6
'use strict';

const venue = (sequelize, DataTypes) => {
  return sequelize.define('venues', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    stadium: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '0'
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '0'
    },
    capacity: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    }
  }, {
    classMethods: {
      getMatches: id => {
        const models = require('.'),
              moment = require('moment');

        return models.Match.findAll({
          where: { venue_id: id },
          attributes: ['id', 'result', 'date', 'group', 'stage'],
          include: [{
            model: models.Team,
            as: 'TeamA',
            attributes: ['id', 'name', 'sname']
          }, {
            model: models.Team,
            as: 'TeamB',
            attributes: ['id', 'name', 'sname']
          }]
        }).then(matches => {
          let arr = [];
          for (let x = 0; x < matches.length; x++) {
            let match = matches[x],
                placeholders = [];

            // matches after 48 are all KO games
            if (match.id > 48) {
              placeholders = match.group.split('v');
            }
            let row = {
              id: match.id,
              result: match.result || '-',
              date: moment(match.date).format('ddd DD MMM, ha'),
              stage: match.stage,
              group: match.group,
              teama: {
                id: (match.TeamA) ? match.TeamA.id : 0,
                name: (match.TeamA) ? match.TeamA.name : placeholders[0],
                flag: (match.TeamA) ? match.TeamA.sname : ''
              },
              teamb: {
                id: (match.TeamB) ? match.TeamB.id : 0,
                name: (match.TeamB) ? match.TeamB.name : placeholders[1],
                flag: (match.TeamB) ? match.TeamB.sname : ''
              }
            };
            arr.push(row);            
          }
          return arr;
        })
      }
    }
  }, {
    tableName: 'venues',
    freezeTableName: true
  });
};

module.exports = venue;