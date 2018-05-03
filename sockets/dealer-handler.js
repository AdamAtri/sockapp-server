// Dealer IO Socket handler

module.exports = function dealerHandlers(app, playersIO, dealersIO, socket) {

  console.log('dealer connection');

  socket.on('dealer:login', (tableId) => {
    console.log('dealer login ' + tableId);
    if (! app.locals.dealers) app.locals.dealers = { };
    if (! app.locals.dealers[tableId]) {
      socket.join(`/${tableId}`);
      app.locals.dealers[tableId] = socket.id;
      console.log(app.locals);
      socket.emit('login:confirm', 'success');
    }
  });
  socket.on('update:player:amt', (id, amt) => {
    console.log('update player amt', id, amt);
    playersIO.to(id).emit('confirm:amt', amt, socket.id);
  });
};
