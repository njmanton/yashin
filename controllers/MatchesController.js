// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      folder = 'matches',
      moment  = require('moment'),
      Promise = require('bluebird'),
      _       = require('lodash'),
      utils   = require('../utils'),
      ga      = require('group-array');

const getMatches = order => {

  return models.Match.findAll({
    order: order ? 'date ASC, stageorder DESC' : 'stageorder DESC, date ASC',
    where: [{ teama_id: { ne: null } }, { teamb_id: { ne: null } }],
    attributes: [
      'id',
      'result',
      'date',
      'group',
      'stage'
    ],
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
      attributes: ['id', 'stadium', 'city']
    }]
  });

};

const controller = {

  get_index: function(req, res) {
    getMatches(false).then(data => {
      data.map(m => {
        m.ldate = moment(m.date).format(utils.ldateFormat);
        m.sdate = moment(m.date).format(utils.sdateFormat);
      });
      res.render(`${ folder }/index`, {
        title: 'Goalmine | Matches',
        matches: ga(data, 'stage'),
        dateorder: false,
      });
    });

  },

  get_date: function(req, res) {

    getMatches(true).then(data => {
      data.map(m => {
        m.ddate = moment(m.date).format(utils.ddateFormat);
        m.time = moment(m.date).format('ha');
      });
      res.render(`${ folder }/index`, {
        title: 'Goalmine | Matches',
        matches: ga(data, 'ddate'),
        dateorder: true,
      });
    });

  },

  get_id: function(req, res, id) {

    // for match view, get match details, preds for that game, and all goals
    const m = models.Match.details(id);
    const p = models.Pred.findAll({
      where: { match_id: id },
      attributes: ['id', 'joker', 'prediction', 'points'],
      include: [{
        model: models.User,
        attributes: ['id', 'username'],
        where: { validated: 1 }
      }]
    });
    const g = models.Goal.find(id);

    Promise.join(m, p, g, (match, preds, goals) => {
      if (!match) {
        res.status(404).render('errors/404');
      } else {
        const visible = moment().isAfter(moment(match.date).subtract(1, 'h')) || match.id < 49;
        res.render(`${ folder }/view`, {
          title: `Goalmine 2018 | ${ match.TeamA.name } vs ${ match.TeamB.name }`,
          dt: moment(match.date).format(utils.ldateFormat),
          match: match,
          preds: preds,
          goals: goals,
          visible: visible,
          scripts: [
            'https://code.highcharts.com/highcharts.js',
            'https://code.highcharts.com/modules/heatmap.js',
            '/js/goalmap.js'
          ]
        });
      }
    });

  },

  get_id_goalmap: function(req, res, id) {
    // returns an array of goal frequencies to generate goalmap
    const r = models.Match.findById(id, { attributes: ['id', 'date', 'result'] }),
          p  = models.Pred.findAll({
            where: { match_id: id },
            attributes: ['prediction', [models.sequelize.fn('count', models.sequelize.col('id')), 'cnt']],
            group: ['prediction'],
            raw: true
          });

    Promise.join(r, p, (result, preds) => {
      let deadline = moment(result.date).startOf('day').add(11, 'h');
      if (moment().isAfter(deadline) || id < 48) {
        let hc = [],
            rs = [],
            sumprod = [0, 0],
            total = 0,
            i = preds.length;

        // if there's a result, split it into goals
        if (result && result.result) {
          rs = result.result.split('-').map(x => x * 1 );
        }

        // iterate over the predictions, add the sum product of each H/A goal (number of goals * number of predictions)
        // and increment the rolling sum. push the goals into the array for the hc heatmap
        while (i--) {
          let pred = preds[i],
              goals = pred.prediction.split('-').map(x => x * 1);
          if (goals.length == 2) {
            sumprod[0] += pred.cnt * goals[0];
            sumprod[1] += pred.cnt * goals[1];
            total += pred.cnt;
            hc.push([goals[0], goals[1], pred.cnt]);
          }
        }
        res.send ({
          counts: hc,
          result: rs,
          mean: sumprod.map(x => parseFloat((x / total).toFixed(2))) // create the weighted average
        });

      } else {
        res.send(null);
      }
    });
  },

  get_points: [utils.isAjax, function(req, res) {
    models.Match.findAll({
      where: { result: { $ne: null } },
      attributes: [
        'id',
        'result',
      ],
      include: [{
        model: models.Team,
        as: 'TeamA',
        attributes: ['name']
      }, {
        model: models.Team,
        as: 'TeamB',
        attributes: ['name']
      }, {
        model: models.Pred,
        attributes: ['points', 'joker']
      }]
    }).then(matches => {
      let data = [], labels = [], jokers = [], points = [];
      for (let x = 0; x < matches.length; x++) {
        let match = {
          labels: `${ matches[x].TeamA.name } v ${ matches[x].TeamB.name }`,
          jokers: matches[x].predictions.reduce((p, v) => { return p += v.joker; }, 0),
          points: {
            id: matches[x].id,
            y: matches[x].predictions.reduce((p, v) => { return p += v.points; }, 0)
          }
        };
        data.push(match);
      }
      data = _.orderBy(data, ['points.y'], ['desc']);

      for (let x = 0; x < data.length; x++) {
        labels.push(data[x].labels);
        jokers.push(data[x].jokers);
        points.push(data[x].points);
      }
      res.send({
        labels: labels,
        jokers: jokers,
        points: points
      });
    });
  }]
};

module.exports = controller;
