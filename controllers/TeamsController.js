// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      folder  = 'teams',
      moment  = require('moment'),
      utils   = require('../utils'),
      Promise = require('bluebird'),
      _       = require('lodash'),
      cfg     = require('../config');

const controller = {

  get_index: function(req, res) {
    models.Team.findAll({
      attributes: ['id', 'name', 'sname', 'group', 'coach', 'notes', 'ranking']
    }).then(teams => {
      res.render(folder + '/index', {
        title: 'All Teams',
        data: teams,
        //debug: JSON.stringify(teams, null, 2)
      })
    })
  },

  get_id: function(req, res, id) {
    // each team page has three data elements: the team itself, its matches and the group table
    const p1 = models.Team.findById(id),
          p2 = models.Team.table(id),
          p3 = models.Match.findAll({
            where: { $or: [{ teama_id: id }, { teamb_id: id }] },
            order: 'stageorder DESC, date ASC',
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

    Promise.join(p1, p2, p3, (team, table, matches) => {
      if (team) {
        table.map(t => {
          t.gd = ((t.gd > 0 ? '+' : '') + t.gd);
          t.sel = (t.id == team.id);
        });

        var games = [];
        for (var x = 0; x < matches.length; x++) {
          var m = matches[x],
              result = null,
              home = (m.TeamA && m.TeamA.id == id);

          if (m.result) {
            result = (home) ? m.result : m.result.split('-').reverse().join('-');
          }

          var oppo = {};
          if (home) {
            oppo = (m.TeamB) ? { id: m.TeamB.id, name: m.TeamB.name, flag: m.TeamB.sname } : { id: null, name: m.group.split('v')[1] };
          } else {
            oppo = (m.TeamA) ? { id: m.TeamA.id, name: m.TeamA.name, flag: m.TeamA.sname } : { id: null, name: m.group.split('v')[0] };
          }

          games.push({
            id: m.id,
            ldate: moment(m.date).format(utils.ldateFormat()),
            sdate: moment(m.date).format(utils.sdateFormat()),
            group: m.group,
            stage: m.stage,
            opponent: oppo,
            result: result || '-',
            venue: {
              id: m.venue.id,
              stadium: m.venue.stadium,
              city: m.venue.city
            }     
          });
        }
        res.render(folder + '/view', {
          title: `Goalmine | ${ team.name }`,
          team: team,
          table: table,
          matches: games,
          //debug: JSON.stringify([team, table, games], null, 2)
        });
      } else {
        res.status(404).render('errors/404');
      }
    })

  },

  get_id_table: function(req, res, id) {
    models.Team.table(id).then(table => {
      res.send(table);
    })
  }
}

module.exports = controller;