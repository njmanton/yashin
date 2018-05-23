// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      utils   = require('../utils'),
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
  },

  // send an array of all goals scored for goaltime chart
  get_times: [utils.isAjax, function(req, res) {
    models.Goal.findAll({
      attributes: ['id', 'scorer', 'time', 'tao', 'type', 'team_id'],
      order: ['time', 'tao'],
      include: {
        model: models.Match,
        attributes: ['id', 'date', 'result'],
        include: [{
          model: models.Team,
          as: 'TeamA',
          attributes: ['id', 'name']
        }, {
          model: models.Team,
          as: 'TeamB',
          attributes: ['id', 'name']
        }]
      }
    }).then(goals => {
      goals.map(g => { g.home = (g.team_id == g.match.TeamA.id); });

      // assign colors to different goal types
      const penColor = 'rgb(0, 0, 128)', ogColor = 'rgb(0, 128, 0)';
      let data = {goals: [], pens: [], ogs: []}, prev = null, yaxis = 0.2;

      // iterate over goals and construct an array of goal objects for highcharts
      for (let x = 0; x < goals.length; x++) {
        const g = goals[x];
        let goal = {};
        // let color = null;
        // if (g.type == 'p') {
        //   color = penColor;
        // } else if (g.type == 'o') {
        //   color = ogColor;
        // }
        if ((g.time + g.tao) == prev) {
          yaxis += 0.15;
        } else {
          yaxis = 0.2;
        }
        goal = {
          x: (g.time + g.tao),
          y: yaxis,
          match: g.match.id,
          scorer: g.scorer,
          team: g.home ? g.match.TeamA.name : g.match.TeamB.name,
          oppo: g.home ? g.match.TeamB.name : g.match.TeamA.name,
          type: g.type
        };
        if (g.type == 'p') {
          goal.color = penColor;
          data.pens.push(goal);
        } else if (g.type == 'o') {
          goal.color = ogColor;
          data.ogs.push(goal);
        } else {
          goal.color = null;
          data.goals.push(goal);
        }
        prev = (g.time + g.tao);
      }
      res.send(data);
    });
  }]
};

module.exports = controller;
