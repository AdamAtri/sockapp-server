// Player IO Socket handler

module.exports = function applyPlayerHandlers(app, playersIO, dealersIO, socket) {

  const dbClient = require('../mongo/dbclient.js');
  const {P_PENDING, P_ACTIVE, T_ACTIVE, PENDING_REASONS, GAMES_ACTIVE} = require('./config');

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
        if (Object.keys(socket.rooms).length > 1) {
          socket.emit('fail', 'Please cashout from your current table if you like to join a new one.');
          throw new Error('JOIN_TABLE_ERR: Multitable join. ' + socket.id);
        }
        return dbClient.getCollection(T_ACTIVE, {tableName: tableId});
      })
      // stop a player from trying to buy into an inactive table
      .then( result => {
        // xxx console.log('verify table is active');
        if (result.length < 1) {
          socket.emit('fail', 'You cannot join a table without a dealer');
          throw new Error('JOIN_TABLE_ERR: inactive table. ' + socket.id);
        }
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
      .then( () => {
        // let the dealer know there's a pending buy-in
        dealersIO.to(dealerSocket).emit('player:buyin', pendingPlayer);
        // let the user know that the request is pending.
        socket.emit('waiting', 'Please pay the dealer.');
      })
      .catch(err => {
        socket.emit('fail', 'An error occurred while trying to join you to the table.');
        console.error(err);
      });
  });

  socket.on('cash:out', () => {
    dealersIO.emit('cash:out', 'Some fucking player wants to cash out');
  });

  socket.on('buy:card', buyCard.bind(null, socket));

  function buyCard(socket, bet) {
    console.log('buyCard', bet);
    // look up the player account
    dbClient.getCollection(P_ACTIVE, {userId: bet.userId})
    .then(players => {
      let player = players[0];
      // verify that we can find the player
      if (! player) {
        socket.emit('fail', 'We could not find your account. That seems strange.');
        throw new Error(`BUYCARD_ERR: player not found. ${bet.userId}`);
      }
      // verify that the user can make a bet that large
      if ((bet.betAmt + bet.commission) > player.amt) {
        socket.emit('fail', 'You can\'t bet more than you\'ve got.');
        throw new Error(`BUYCARD_ERR: funds - ${bet.userId} ${bet.socketId}`);
      }
      // update the player's account to reflect the deduction of the
      //  bet amount and commission
      let newAmt = player.amt - (bet.betAmt + bet.commission);
      return dbClient.updateItem(P_ACTIVE, {_id: player._id}, {
        $set: {amt: newAmt}
      }).then(result => {
        socket.emit('update:player', result.value);
      });
    })
    .then(() => {
      // add the bet to the 'cards' collection on the active game.
      return dbClient.updateItem(GAMES_ACTIVE, {tableId: bet.tableId}, {
        $push:{cards: Object.assign(bet, {socket: socket.id, result: null})}
      });
    })
    .then( () => {
      // find and return the updated game
      return dbClient.getCollection(GAMES_ACTIVE, {tableId: bet.tableId});
    })
    .then( games => {
      // send the updated game details to the dealer.
      console.log(games);
      dealersIO.to(games[0].tableId).emit('updated:game', games[0]);
    })
    .then(() => {
      // notify the player that the transaction is complete.
      socket.emit('notify', `Purchased ${bet.card} card for ${bet.betAmt}`);
    })
    .catch(err => {
      console.error(err);
      socket.emit('fail', 'An error has occurred. ' + err.message);
    });
  }
};
