'use strict';

const models  = require('../models'),
      Promise = require('bluebird'),
      utils   = require('../utils'),
      folder  = 'goals';

const controller = {

  get_index: function(req, res) {
    const g = models.Goal.findAll({
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
    });

    const sql = `SELECT scorer, T.sname, COUNT(G.id) AS cnt
      FROM goals G
      JOIN teams T ON T.id = G.team_id
      WHERE type IS NULL OR type <> 'o'
      GROUP BY scorer, T.sname
      ORDER BY 3 DESC`;

    const s = models.sequelize.query(sql, { type: models.sequelize.QueryTypes.SELECT });

    Promise.join(g, s, (goals, scorers) => {
     goals.map(goal => {
      goal.oppo = goal['team.name'] == goal['match.TeamA.name'] ? goal['match.TeamB.name'] : goal['match.TeamA.name'];
      goal.oppoflag = goal['team.name'] == goal['match.TeamA.name'] ? goal['match.TeamB.sname'] : goal['match.TeamA.sname'];
      });

      res.render(`${ folder }/index`, {
        data: goals,
        scorers: scorers,
        title: 'All Goals',
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
          x: g.time == 45 ? 45 : (g.time + g.tao),
          y: yaxis,
          time: g.time,
          tao: g.tao,
          match: g.match.id,
          scorer: g.scorer,
          team: g.home ? g.match.TeamA.name : g.match.TeamB.name,
          oppo: g.home ? g.match.TeamB.name : g.match.TeamA.name,
          type: g.type
        };
        goal.str = `${ g.scorer } (${ g.time }${ g.tao ? `+${ g.tao }` : '' }'${ g.type == 'o' ? ' og' : '' }${ g.type == 'p' ? ' pen' : '' })<br><strong>${ goal.team }</strong> v ${ goal.oppo }<br>Click to select match`;

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
  }],

  // get the average prediction for each match
  get_means: [utils.isAjax, function(req, res) {
    const sql = `SELECT 
      match_id AS mid,
      T1.name AS team1,
      T2.name AS team2,
      M.result AS result,
      SUBSTRING(M.result, 1, 1) - AVG(SUBSTRING(prediction, 1, 1) * 1) AS x,
      SUBSTRING(M.result, 3, 1) - AVG(SUBSTRING(prediction, 3, 1) * 1) AS y
      FROM predictions P
      JOIN matches M on M.id = P.match_id
      JOIN teams T1 on M.teama_id = T1.id
      JOIN teams T2 on M.teamb_id = T2.id
      WHERE result IS NOT NULL
      GROUP BY match_id, T1.name, T2.name, result`;
    models.sequelize.query(sql, { type: models.sequelize.QueryTypes.SELECT }).then(means => {
      means.map(mean => {
        let [h, a] = mean.result.split('-');
        let dist = Math.sqrt(mean.x ** 2 + mean.y ** 2).toFixed(2);
        mean.label = `<b>${ mean.team1 } ${ h }</b> (${ (h - mean.x).toFixed(2) })<br><b>${ mean.team2 } ${ a } </b>(${ (a - mean.y).toFixed(2)})<br>distance: ${ dist }<br>Click to see game`;
      });
      res.send(means);
    });
  }]
};

module.exports = controller;
