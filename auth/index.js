'use strict';

const models              = require('../models'),
      bCrypt              = require('bcrypt-nodejs'),
      passport            = require('passport'),
      logger              = require('winston'),
      moment              = require('moment'),
      LocalStrategy       = require('passport-local').Strategy,
      FacebookStrategy    = require('passport-facebook').Strategy,
      GoogleStrategy      = require('passport-google-oauth').OAuth2Strategy;

// callback addresses
const domain_cb = (process.env.YASHIN_PROD == 1) ? 'https://worldcup.goalmine.eu/' : 'http://localhost:1960/';
const fb_cb = `${ domain_cb }auth/facebook/callback`,
      gl_cb = `${ domain_cb }auth/google/callback`;

module.exports.createHash = password => {
  return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};

module.exports = app => {

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use('local', new LocalStrategy({ passReqToCallback: true },
    (req, username, password, done) => {
      models.User.findOne({
        where: { username: username }
      }).then(user => {
        if (!user) {
          logger.error(`Unknown user '${ username }' attempted login`);
          return done(null, false, { message: 'user not found' });
        }
        try {
          if (!bCrypt.compareSync(password, user.password)) {
            logger.info(`Incorrect password for ${ user.username }`);
            return done(null, false, { message: 'incorrect password' });
          }
        } catch(e) {
          return done(null, false, { message: 'problem entering password' });
        }
        let now = moment().format('YYYY-MM-DD HH:mm:ss');
        user.update({ resetpwd: null, lastlogin: now }); // nullify reset code, if present
        req.flash('success', `logged in. welcome back ${ user.username }`);
        if (!user.paid) {
          req.flash('error', 'You have not yet paid your entry fee. You can <a target="_blank" href="https://paypal.me/nickm/2">pay <i class="fab fa-paypal"></i></a> now.');
        }
        return done(null, user);
      }).catch(err => {
        logger.info('Error finding user');
        return done(err);
      });
    }
  ));

  passport.use(new FacebookStrategy({
    clientID          : process.env.FB_APP_ID || null,
    clientSecret      : process.env.FB_SECRET || null,
    callbackURL       : fb_cb,
    passReqToCallback : true
  },
    (req, token, refreshToken, profile, done) => {
      process.nextTick(() => {
        // if user is already logged in, link FB account by saving FB id to user object
        if (req.user) {
          models.User.findById(req.user.id).then(user => {
            if (user) {
              user.update({ facebook_id: profile.id }).then(upd => {
                if (upd) {
                  req.flash('info', 'Account now linked to your Facebook profile');
                  logger.info(`${ user.username } has linked their Facebook account`);
                  return done(null, req.user);
                }
              });
            } else {
              req.flash('error', 'Couldn\'t link your Facebook profile');
              return done(null, req.user);
            }
          }).catch(e => {
            logger.error(e);
            return done(e);
          });
        } else {
          // find the user in the database based on their facebook id
          models.User.findOne({
            where: { facebook_id: profile.id }
          }).then(user => {
            if (user) {
              req.flash('success', 'Logged in via Facebook');
              logger.info(`(FB) ${ user.username } logged in`);
              user.update({ resetpwd: null });
              return done(null, user);
            } else {
              req.flash('error', 'Can\'t find matching FB user');
              return done(null, false, { message: 'Can\'t find matching FB user. Have you linked your account?' });
            }
          }).catch(e => {
            logger.error(`error looking up user with FB profile id ${ profile.id }`);
            return done(e);
          });
        }

      });
    }
  ));

  passport.use(new GoogleStrategy({
    clientID          : process.env.G_APP_ID || null,
    clientSecret      : process.env.G_SECRET || null,
    callbackURL       : gl_cb,
    passReqToCallback : true
  },
    (req, token, refreshToken, profile, done) => {
      process.nextTick(() => {
        if (req.user) {
          models.User.findById(req.user.id).then(user => {
            if (user) {
              user.update({ google_id: profile.id }).then(upd => {
                if (upd) {
                  req.flash('info', 'Account now linked to your Google+ profile');
                  logger.info(`${ user.username } has linked their Google account`);
                  return done(null, req.user);
                }
              });
            } else {
              req.flash('error', 'Couldn\'t link your Google profile');
              return done(null, req.user);
            }
          }).catch(e => {
            return done(e);
          });
        } else {
          // find the user in the database based on their google id
          models.User.findOne({
            where: { google_id: profile.id }
          }).then(user => {
            if (user) {
              user.update({ resetpwd: null });
              req.flash('success', 'Logged in via Google');
              logger.info(`(Google) ${ user.username } logged in`);
              return done(null, user);
            } else {
              return done(null, false, { message: 'Can\'t find matching Google+ user. Have you linked your account?' });
            }
          }).catch(e => {
            logger.error(`error looking up user with Google profile id ${ profile.id }`);
            return done(e);
          });
        }

      });
    }
  ));


  // make user object available in handlebars views
  app.use((req, res, next) => {
    if (!res.locals.user && req.user) {
      res.locals.user = req.user;
    }
    next();
  });

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    models.User.findById(id).then(user => {
      done(null, user);
    });
  });

};
