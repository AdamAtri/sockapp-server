module.exports = function sbmiddleware(http) {

  'use strict';

  const express = require('express');
  const sbApp = express();
  const io = require('socket.io')(http);
  const uuid = require('uuid/v1');

  const { join } = require('path');

  console.log('setting-up');
  sbApp.use('*', (req, res, next) => {
    if (! req.signedCookies.user ) {
      let tempId = 'temp-' + uuid();
      res.cookie('user', tempId, {
        httpOnly: true,
      });
    }
    next();
  });

  sbApp.get('/dealer', (req, res) => { res.sendFile(join(__dirname, 'public', 'dealer.html')); });

  sbApp.use(express.static(join(__dirname, 'public')));
  sbApp.use('/api', require('./api/index.js'));

  const
    playersIO = io.of('/players'), // make Player channel
    dealersIO = io.of('/dealers'); // make Dealer channel

  // Handle Player Sockets
  const playerHandlers = require('./sockets/player-handler');
  const applyPlayerHandlers = playerHandlers.bind(null, sbApp, playersIO, dealersIO);
  playersIO.on('connection', applyPlayerHandlers);

  // Handle Dealer Sockets
  const dealerHandlers = require('./sockets/dealer-handler');
  const applyDealerHandlers = dealerHandlers.bind(null, sbApp, playersIO, dealersIO);
  dealersIO.on('connection', applyDealerHandlers);

  return sbApp;
};
