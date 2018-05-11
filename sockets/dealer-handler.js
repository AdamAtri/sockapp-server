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
      .catch(err => {
        console.error(err);
        socket.emit('fail', 'Error attempting to join dealer to table.');
      });
  });

  socket.on('update:player:amt', ({amt, userId, tableId, reason, socketId}) => {
    // find and remove the user that we are attempting to update
    // from within the pending-players collection
    dbClient.getAndRemoveItem(P_PENDING, {userId, tableId, reason})
      // add the user to the active-players table
      .then(pendingPlayer => {
        if (! pendingPlayer ) throw new Error('Unable to find pending player');
        let player = Object.assign(pendingPlayer.value, {amt});
        delete player._id;
        return dbClient.insertItem(P_ACTIVE, player);
      })
      // alert the user that they have been added,
      //  and send the updated collection to the dealer.
      .then(inserted => {
        const doc = inserted.ops[0];
        dbClient.getDocById(P_ACTIVE, doc._id, {_id:false}).then(activePlayer => {
          let playerSocket = playersIO.sockets[socketId];
          let tableRoom = `/${tableId}`;
          playerSocket.join(tableRoom);
          playerSocket.emit('ready:player:join', activePlayer);
          playerSocket.to(tableRoom).emit('new:player', {socketId});
        })
        .catch(console.error);
        dbClient.getCollection(P_ACTIVE, {tableId}).then(collection => {
          socket.emit('updated:players', collection);
        })
        .catch(console.error);
      })
      .catch(err => {
        console.error(err);
        socket.emit('fail', "An error occurred while updating the player's credit amount.");;
      });
  });

  socket.on('cancel:request', model => {
    console.log('cancel request', model);
    dbClient.getAndRemoveItem(P_PENDING, model).then( pendingPlayer => {
      pendingPlayer = pendingPlayer.value;
      console.log('pending player', pendingPlayer);
      socket.emit('notify', `Pending ${pendingPlayer.reason} request canceled` );
      playersIO.to(pendingPlayer.socketId).emit('notify',
        `Your ${pendingPlayer.reason} request on table ${pendingPlayer.tableId} has been canceled`);
    })
    .catch(console.error);
  });

  socket.on('start:game', tableId => {
    console.log('start game for tableId' + tableId);
  });
};
