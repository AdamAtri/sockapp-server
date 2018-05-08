
module.exports = (function() {

  'use strict';

  const API = require('express')();
  const dbClient = require('../mongo/dbclient');
  API.use('/user', require('./module/user')(dbClient));

  return API;

})();
