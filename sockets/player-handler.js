// Player IO Socket handler

module.exports = function applyPlayerHandlers(app, playersIO, dealersIO, socket) {

  const dbClient = require('../mongo/dbclient.js');
  const {P_PENDING, T_ACTIVE, PENDING_REASONS} = require('./config');

  socket.on('join:table', ({tableId, userId}) => {
    // xxx console.log('join:table');
    let reason = PENDING_REASONS.BUYIN;
    let socketId = socket.id;
    let pendingPlayer;
    let dealerSocket;

    Promise.resolve()
      // stop a player from trying to buy into more than one table
      .then( () => {
        // xxx console.log('verify not on any other tables');
        if (Object.keys(socket.rooms).length > 1)
          throw new Error('Please cashout from your current table.');
        return dbClient.getCollection(T_ACTIVE, {tableName: tableId});
      })
      // stop a player from trying to buy into an inactive table
      .then( result => {
        // xxx console.log('verify table is active');
        if (result.length < 1)
          throw new Error('Cannot join a table without a dealer');
        // pass on the requested active table
        return result[0];
      })
      // alert the dealer of the requested table that there is a pending player buyin,
      //  and add the user to the pending-players table.
      .then( tableData => {
        // xxx console.log('active table', tableData);
        dealerSocket = tableData.dealerSocket;
        pendingPlayer = { userId, socketId, tableId, reason };
        return dbClient.insertItem(P_PENDING, pendingPlayer);
      })
      .then( inserted => {
        console.log(inserted[0]);
        // xxx console.log('alert user inserted', dealerSocket, pendingPlayer);
        // let the dealer know there's a pending buy-in
        dealersIO.to(dealerSocket).emit('player:buyin', pendingPlayer);
        // let the user know that the request is pending.
        socket.emit('waiting', 'Please pay the dealer.');
      })
      .catch(err => {
        return socket.emit('fail', err.message);
      });
  });

  socket.on('cash:out', () => {
    dealersIO.emit('cash:out', 'Some fucking player wants to cash out');
  });
};
