// jshint node: true, esversion: 6
'use strict';

const goal = (sequelize, DataTypes) => {
  return sequelize.define('goals', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    match_id: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    team_id: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    scorer: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '0'
    },
    type: {
      type: DataTypes.ENUM('P','O'),
      allowNull: true
    },
    time: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '0'
    },
    tao: {
      type: DataTypes.INTEGER(4),
      allowNull: true
    }
  }, { 
    classMethods: {
      find: mid => {
        const models = require('.');

        // first get the team ids so we can put goals into correct bucket
        return models.Match.findById(mid, { attributes: ['teama_id', 'teamb_id'] }).then(match => {
          const home = match.teama_id,
                away = match.teamb_id;
          // get all the goals for that match
          return models.Goal.findAll({
            where: { match_id: mid },
            attributes: ['match_id', 'team_id', 'scorer', 'time', 'tao', 'type'],
            order: ['scorer', 'time', 'tao']
          }).then(goals => {
              //create array of 'home' and 'away' goals
              let arr = { home: [], away: [] };
              for (var x = 0; x < goals.length; x++) {
                let goal = goals[x],
                    scorer = `${ goal.scorer } ${ goal.time }`,
                    team = (home == goal.team_id) ? 'home': 'away';
                
                scorer += ((goal.tao) ? `+${ goal.tao }` : '') + "'";
                // each goal is a string
                if (home == goal.team_id) {
                  arr.home.push(scorer);
                } else {
                  arr.away.push(scorer);
                }
              }
            return arr;
          })
        })

      }
    }
  }, {
    tableName: 'goals',
    freezeTableName: true
  });
};

module.exports = goal;
