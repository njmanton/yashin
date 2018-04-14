// jshint node: true, esversion: 6
'use strict';

const debug = {
  expiry: 0, // override deadline restriction
  ajax:   1, // override ajax-only restriction
  auth:   0, // override authorise-only restriction
  admin:  0, // override admin-only restriction
  anon:   0  // override anon-only restriction
}

const points = {
  win: 5,
  correct_difference: 3,
  correct_result: 1,
  joker_penalty: -1
};

var utils = {

  getTempName: len => {
    var code = '', 
      letters = '2346789ABCDEFGHJKLMNPQRTUVWXYZ'; // ignore easily-confused chars, e.g. 1 (one) and 'l' (lower case letter)
  
    // generate a random code
    for (var i = 0; i < len; i++) {
      var idx = Math.floor(Math.random() * (letters.length - 1));
      code += letters[idx];
    }
    return code;
  },

  // access functions used in routes
  isAjax: (req, res, next) => {
    if (req.xhr || debug.ajax) {
      return next();
    } else {
      res.sendStatus(403);
    }
  },

  isAuthenticated: (req, res, next) => {
    if (req.isAuthenticated() || debug.auth) {
      return next();
    }
    req.session.returnTo = req.url;
    res.redirect('/login');
  },

  isAnon: (req, res, next) => {
    if (!req.isAuthenticated() && !debug.anon) {
      return next();
    } else {
      req.flash('info', 'You cannot perform that action while logged in');
      res.redirect('/home');
    }
  },

  isAdmin: (req, res, next) => {
    if ((req.isAuthenticated() && req.user.admin == 1) || debug.admin) {
      return next();
    } else if (req.isAuthenticated()) {
      res.render('errors/403');
    } else {
      req.session.returnTo = req.url;
      res.redirect('/login');
    }
  },

  calc: (pred, result, joker) => {
  
    if (!pred || !result) return 0;

    let pg, rg, score = 0;
    pg = pred.split('-');
    if (result && pred) {
      rg = result.split('-');
      pg = pred.split('-');
    } else {
      return score;
    }

    if (pred == result) {
      score = points.win * (joker + 1);
    } else if ((pg[0] - rg[0]) == (pg[1] - rg[1])) {
      score = points.correct_difference * (joker + 1);
    } else if (Math.sign(pg[0] - pg[1]) == Math.sign(rg[0] - rg[1])) {
      score = points.correct_result * (joker + 1);
    } else {
      score = (joker * points.joker_penalty);
    }
    return score;

  },

  validScore: score => {
    return !!score && !!score.match(/^\b\d{1,2}[-|_|=]\d{1,2}\b$/);
  },

  ldateFormat: () => { return 'ddd DD MMM, ha'; },

  sdateFormat: () => { return 'DD/MM, ha'; },

  ddateFormat: () => { return 'dddd DD MMM'; }

};

module.exports = utils;