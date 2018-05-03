// Player IO Socket handler

module.exports = function applyPlayerHandlers(app, playersIO, dealersIO, socket) {
  console.log('player connected');

  socket.on('join:table', (tableId) => {
    if (! (app.locals.dealers && app.locals.dealers[tableId]) ) {
      return socket.emit('fail', 'Cannot join a table without a dealer');
    }
    console.log('join:table', tableId, app.locals.dealers[tableId]);
    dealersIO.to(app.locals.dealers[tableId]).emit('add:player', socket.id);
  });

  socket.on('cash:out', () => {
    dealersIO.emit('cash:out', 'Some fucking player wants to cash out');
  });

  socket.on('amt:confirmed', amt => {
    console.log('player confirms $: ' + amt);
  });

  socket.on('amt:dispute', (dealer, amt) => {
    console.log('you got some splaining to do: ' + dealer);
  });
};
