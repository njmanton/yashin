// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      folder  = 'goals';

const controller = {

  get_index: function(req, res) {
    models.Goal.findAll({
      attributes: ['id', 'scorer', 'time', 'tao', 'type'],
      order: [['order', 'ASC']],
      raw: true,
      include: [{
        model: models.Team,
        attributes: ['id', 'name', 'sname'],
      }, {
        model: models.Match,
        attributes: ['id', 'date'],
        include: [{
          model: models.Team,
          as: 'TeamA',
          attributes: ['id', 'name', 'sname']
        }, {
          model: models.Team,
          as: 'TeamB',
          attributes: ['id', 'name', 'sname']
        }]
      }]
    }).then(goals => {
      goals.map(goal => {
        goal.oppo = goal['team.name'] == goal['match.TeamA.name'] ? goal['match.TeamB.name'] : goal['match.TeamA.name'];
        goal.oppoflag = goal['team.name'] == goal['match.TeamA.name'] ? goal['match.TeamB.sname'] : goal['match.TeamA.sname'];
      });
      res.render(`${ folder }/index`, {
        data: goals,
        title: 'All Goals',
        //debug: JSON.stringify(goals, null, 2)
      });
    });
  }
};

module.exports = controller;
