'use strict';
var config = require('../config');
const iothub = require('azure-iothub');
const hubCS = config.hubCS;
var deviceId, deviceKey;

const passport = require('passport');
const express = require('express');
const router = express.Router();

function extractKey(deviceInfo) {
  return deviceInfo.authentication.symmetricKey.primaryKey;
}
function register(deviceId, callback) {
  let registry = iothub.Registry.fromConnectionString(hubCS);
  registry.create({ deviceId: deviceId }, function (err, deviceInfo, result) {
    if (err) {
      return callback(err);
    }
    else {
      deviceKey = deviceInfo.authentication.symmetricKey.primaryKey;
      return callback(null, deviceKey);
    }
  });
}
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  else {
    res.redirect('/login');
  }
};

function doThePassportThing(req, res, next) {
  passport.authenticate('azuread-openidconnect',
    {
      response: res,                      // required
      failureRedirect: '/'
    }
  )
};


/* GET home page. Authenticate and if OK try to register a device using the AD user id*/
router.get('/', ensureAuthenticated, function (req, res) {
  res.redirect('/register');
});

router.post('/', ensureAuthenticated, function (req, res) {
    console.log(req.user);
    res.redirect('/register');
});

// '/register' is only available to logged in user
router.get('/register', function (req, res) {
  deviceId = req.user.displayName.replace(/\s/g, '');

  try {
    var registry = iothub.Registry.fromConnectionString(hubCS);
  } catch (err) {
    res.render('error', { error: err })
  }

  registry.create({ deviceId: deviceId }, function (err, deviceInfo, result) {
    if (err) {
      // handle registry error such as device alrady registered
      registry.get(deviceId, function (err, deviceInfo) {
        if (deviceInfo) {
          deviceKey = extractKey(deviceInfo);
        }
        else {
          deviceKey = 'kaput';
        }
      });
    }
    else {
      deviceKey = extractKey(deviceInfo);
    }
  });
    res.redirect('status');
});

router.get('/status', function (req, res) {
  res.json({ deviceId: deviceId, deviceKey: deviceKey })
});

// '/action' is only available to logged in user 
/*router.post('/action', ensureAuthenticated, function (req, res) {
  switch (req.body.action) {
    case 'logout':
      req.logout();
      res.redirect('/');
      break;
    case 'pub':
      res.render('test', { title: 'XC2 Log Upload Demo', device: 'blank', result: 'logfile uploaded' });
      break;
  }
});
*/
router.get('/login2', function (req, res, next) {
  console.log('get login')
  authen(req, res, next)
  /*
  passport.authenticate('azuread-openidconnect',
    {
      response: res,
      failureRedirect: '/'
    }
  )(req, res, next);
},
  function (req, res) {
    res.redirect('register');
  });*/
})



router.get('/login',
  function (req, res, next) {
    passport.authenticate('azuread-openidconnect',
      {
        response: res,                      // required
        failureRedirect: '/'
      }
    )(req, res, next);
  },
  function (req, res) {
    log.info('Login was called in the Sample');
    res.redirect('/');
  });


// 'POST returnURL'
// `passport.authenticate` will try to authenticate the content returned in
// body (such as authorization code). If authentication fails, user will be
// redirected to '/' (home page); otherwise, it passes to the next middleware.
router.post('/auth/openid/return', function (req, res, next) {
  passport.authenticate('azuread-openidconnect',
    {
      response: res,                      // required
      failureRedirect: '/'
    }
  )(req, res, next);
},
  function (req, res) {
    console.log('redirected from active directory')
    res.redirect('/register');
  });

module.exports = router;

// 'POST returnURL'
// `passport.authenticate` will try to authenticate the content returned in
// body (such as authorization code). If authentication fails, user will be
// redirected to '/' (home page); otherwise, it passes to the next middleware.
router.get('/auth/openid/return', function (req, res, next) {
  passport.authenticate('azuread-openidconnect',
    {
      response: res,
      failureRedirect: '/'
    }
  )(req, res, next);
},
  function (req, res) {
    console.log('redirected')
    res.redirect('/register');
  });

module.exports = router;
