// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      folder  = 'venues',
      Promise = require('bluebird');

const controller = {

  get_index: function(req, res) {
    models.Venue.findAll({
      include: {
        model: models.Match,
        attributes: ['id']
      }
    }).then(venues => {
      venues.map(v => { v.capacity = v.capacity.toLocaleString(); });
      res.render(`${ folder }/index`, {
        title: 'Venues',
        data: venues,
        //debug: JSON.stringify(venues, null, 2)
      });
    });
  },

  get_id: function(req, res, id) {
    if (id < 13) {
      const v = models.Venue.findById(id),
            m = models.Venue.getMatches(id);

      Promise.join(v, m, (venue, matches) => {
        venue.capacity = venue.capacity.toLocaleString();
        res.render(`${ folder }/view`, {
          title: venue.stadium,
          matches: matches,
          venue: venue,
        });
      });
    } else {
      res.status(404).render('errors/404', { title: 'Venue not found' });
    }
  }
};

module.exports = controller;
