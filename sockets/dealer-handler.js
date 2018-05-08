// Dealer IO Socket handler

module.exports = function dealerHandlers(app, playersIO, dealersIO, socket) {

  const dbClient = require('../mongo/dbclient');
  const {T_ACTIVE, P_PENDING, P_ACTIVE} = require('./config');

  socket.on('dealer:login', ({tableId, userId}) => {

    /* TODO: validate tableId */

    dbClient.getCollection(T_ACTIVE, {tableName: tableId})
      .then(result => {
        // if there's an active table just OVERWRITE it right now.
        if (result.length > 0) {
          console.log('OVERWRITE:', result);
          let table = result[0];
          return dbClient.updateItem(T_ACTIVE, {
            _id: table._id,
            dealer: userId,
            dealerSocket: socket.id
          });
        }
        // set the dealer to the table
        else {
          return dbClient.insertItem(T_ACTIVE, {
            tableName: tableId,
            dealer: userId,
            dealerSocket: socket.id
          });
        }
      })
      .then(() => {
        socket.join(`/${tableId}`);
        socket.emit('login:confirm', tableId);
      })
      .catch(err => {socket.emit('fail', 'Error attempting to join dealer to table.');});
  });

  socket.on('update:player:amt', ({ tableId, playerId, amt }) => {
    console.log('ids', tableId, playerId, amt);
    // find and remove the user that we are attempting to update
    // from within the pending-players collection
    dbClient.getAndRemoveItem(P_PENDING, {userId: playerId})
      // add the user to the active-players table
      .then(pendingPlayer => {
        if (! pendingPlayer ) throw new Error('Unable to find pending player');
        let player = pendingPlayer.value;
        return dbClient.insertItem(P_ACTIVE, {
          userId: player.userId,
          socketId: player.socketId,
          tableId: player.tableId,
          amt: amt
        });
      })
      // alert the user that they have been added,
      //  and send the updated collection to the dealer.
      .then(inserted => {
        const doc = inserted.ops[0];
        console.log('doc', doc);
        dbClient.getDocById(P_ACTIVE, doc._id, {_id:false}).then(activePlayer => {
          console.log('activePlayer', activePlayer);
          playersIO.to(activePlayer.socketId).emit('ready:player:join', activePlayer);
        });
        dbClient.getCollection(P_ACTIVE, {tableId}).then(collection => {
          socket.emit('updated:players', collection);
        });
      })
      .catch(err => {socket.emit('fail', err.message);});
  });
};
