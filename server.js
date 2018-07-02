const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const uuid = require('uuid/v1');

const ENV = process.env.NODE_ENV;
const { SECRET } = require('./server-config');

const { join } = require('path');

const
  bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser');

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.cookieParser = cookieParser;
app.secret = SECRET;
app.use(app.cookieParser(app.secret));

app.use('*', (req, res, next) => {
  if (! req.signedCookies.user ) {
    let tempId = 'temp-' + uuid();
    res.cookie('user', tempId, {
      httpOnly: true,
    });
  }
  next();
});


app.use('/', express.static(join(__dirname, 'public')));
app.get('/dealer', (req, res) => {res.sendFile(join(__dirname, 'public', 'dealer.html'));});
app.use('/api', require('./api/index.js'));

const
  playersIO = io.of('/players'), // make Player channel
  dealersIO = io.of('/dealers'); // make Dealer channel

// Handle Player Sockets
const playerHandlers = require('./sockets/player-handler');
const applyPlayerHandlers = playerHandlers.bind(null, app, playersIO, dealersIO);
playersIO.on('connection', applyPlayerHandlers);

// Handle Dealer Sockets
const dealerHandlers = require('./sockets/dealer-handler');
const applyDealerHandlers = dealerHandlers.bind(null, app, playersIO, dealersIO);
dealersIO.on('connection', applyDealerHandlers);


http.listen(1517, () => console.log(`listening on 1517 (${ENV})` || ''));
