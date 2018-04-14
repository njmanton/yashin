// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      folder = 'matches',
      moment  = require('moment'),
      Promise = require('bluebird'),
      utils   = require('../utils'),
      ga      = require('group-array'),
      cfg     = require('../config');

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
  })

};

const controller = {

  get_index: function(req, res) {

    getMatches(false).then(data => {
      data.map(m => { 
        m.ldate = moment(m.date).format(utils.ldateFormat());
        m.sdate = moment(m.date).format(utils.sdateFormat());
      });
      res.render(folder + '/index', {
        title: 'Goalmine | Matches',
        matches: ga(data, 'stage'),
        dateorder: false,
        //debug: JSON.stringify(ga(data, 'stage'), null, 2)
      });
    });

  },

  get_date: function(req, res) {

    getMatches(true).then(data => {
      data.map(m => { 
        m.ddate = moment(m.date).format(utils.ddateFormat());
        m.time = moment(m.date).format('ha');
      });
      res.render(folder + '/index', {
        title: 'Goalmine | Matches',
        matches: ga(data, 'ddate'),
        dateorder: true,
        //debug: JSON.stringify(ga(data, 'ddate'), null, 2)
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
      res.render(folder + '/view', {
        title: `Goalmine 2018 | ${ match.TeamA.name } vs ${ match.TeamB.name }`,
        dt: moment(match.date).format('DD MMM, HH:mm'),
        match: match,
        preds: preds,
        goals: goals,
        script: '/js/goalmap.js',
        //debug: JSON.stringify({match: match, preds: preds, goals: goals}, null, 2)
      })
    })

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
            hc.push([goals[0], goals[1], pred.cnt])
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
    })
  }
}

module.exports = controller;
