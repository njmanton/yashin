// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      folder  = 'goals';

const controller = {

  get_index: function(req, res) {
    models.Goal.findAll({
      attributes: ['id', 'scorer', 'time', 'tao', 'type'],
      include: [{
        model: models.Team,
        attributes: ['id', 'name', 'sname'],
      }, {
        model: models.Match,
        attributes: ['id', 'date']
      }]
    }).then(goals => {
      res.render(folder + '/index', {
        data: goals,
        title: 'All Goals',
        //debug: JSON.stringify(goals, null, 2)
      })
    })
  }
}

module.exports = controller;
