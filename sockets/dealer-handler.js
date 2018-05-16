// Dealer IO Socket handler

module.exports = function dealerHandlers(app, playersIO, dealersIO, socket) {

  const dbClient = require('../mongo/dbclient');
  const rollValidator = require('../game/roll-validator');
  const {T_ACTIVE, P_PENDING, P_ACTIVE, GAMES, GAMES_ACTIVE} = require('./config');

  socket.on('dealer:login', ({tableId, userId}) => {

    /* TODO: validate tableId */

    dbClient.getCollection(T_ACTIVE, {tableName: tableId})
      .then(result => {
        // if there's an active table just OVERWRITE it right now.
        if (result.length > 0) {
          let table = result[0];
          return dbClient.updateItem(T_ACTIVE,
            { _id: dbClient.objectId(table._id) },
            {
              dealer: userId,
              dealerSocket: socket.id
            }
          );
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
    // from the pending-players collection
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
          playerSocket.join(tableId);
          playerSocket.emit('ready:player:join', activePlayer);
          playerSocket.to(tableId).emit('new:player', {activePlayer});
        })
        .catch(console.error);

        dbClient.getCollection(P_ACTIVE, {tableId}).then(collection => {
          socket.emit('updated:players', collection);
        })
        .catch(console.error);
      })
      .catch(err => {
        console.error(err);
        socket.emit('fail', "An error occurred while updating the player's credit amount.");
      });
  });

  // Cancel a pending request
  socket.on('cancel:request', model => {
    dbClient.getAndRemoveItem(P_PENDING, model).then( pendingPlayer => {
      pendingPlayer = pendingPlayer.value;
      socket.emit('notify', `Pending ${pendingPlayer.reason} request canceled` );
      playersIO.to(pendingPlayer.socketId).emit('notify',
        `Your ${pendingPlayer.reason} request on table ${pendingPlayer.tableId} has been canceled`);
    })
    .catch(console.error);
  });

  // Dealer is starting a game
  socket.on('start:game', tableId => {
    dbClient.getCollection(GAMES_ACTIVE, {tableId})
    .then(result => {
      if (result.length > 0) {
        socket.emit('fail', 'There can only be one active game at a time');
        throw new Error(`MORE_THAN_ONE_ERROR - ${tableId}: ${JSON.stringify(result)}`);
      }
      else {
        // create and return a historical document
        return dbClient.insertItem(GAMES, {tableId, creation: Date.now(), cards:[], rounds: [], type: 'single-line'});
      }
    })
    .then(inserted => {
      // add it to the active documents
      let historicDoc = inserted.ops[0];
      return dbClient.insertItem(GAMES_ACTIVE, historicDoc)
              .then(() => historicDoc);
    })
    .then(inserted => {
      let gameInfo = inserted;
      // create the first round data
      dbClient.insertItem('active-rounds', {gameId:gameInfo._id, number:1, result:'', bets:[]})
      .then(insertedRound => {
        // let everyone know that the game has started
        insertedRound = insertedRound.ops[0];
        socket.emit('new:game', Object.assign(gameInfo, {round: insertedRound.number}));
        playersIO.to(`/${tableId}`).emit('new:game');
      })
      .catch(console.error);
    })
    .catch(console.error);
  });

  socket.on('enter:roll', ({gameId, rollData}) => {
    gameId = dbClient.objectId(gameId);
    let game;
    let isWinner;
    let roundData;
    // get and retain the game data
    dbClient.getCollection(GAMES_ACTIVE, {_id: gameId})
    .then( games => {
      if ( games.length < 1 ) throw new Error('Game not found.' + gameId);
      game = games[0];
      isWinner = rollValidator.isWinner(game, rollData);
      // let the players know what the roll results are
      let tableRoom = game.tableId.toString();
      playersIO.to(tableRoom).emit('announce:roll', 'hello');
      // return the active round
      return dbClient.getAndRemoveItem('active-rounds', {gameId});
    })
    .then(result => {
      // add the roll info to the round data
      roundData = Object.assign(result.value, {result: rollData});

      if (isWinner) {
        return finishGame.call(this, game, roundData);
      }
      return startNextRound.call(this, game, roundData);
    })
    .then(games => {
      game = games[0];
      let bonusWinners = game.rounds[game.rounds.length - 1].bets.filter(b => b.result !== 'collected');
      console.log('winners', winners);
      // TODO: update player balances
    })
    .then(() => {
      if (isWinner) {
        playersIO.to(game.tableId).emit('game:over');
        socket.emit('game:over');
      }
      else {
        dbClient.insertItem('active-rounds', {gameId:game._id, number: roundData.number + 1, result:'', bets:[]})
        .then(result => {
          playersIO.to(game.tableId).emit('next:round');
          socket.emit('next:round');
        })
      }
    })
    .catch(console.error);
  });

  function finishGame(game, roundData) {
    return dbClient.getAndRemoveItem(GAMES_ACTIVE, {_id: game._id})
    .then(gameDoc => {
      let roll = roundData.result;
      game = gameDoc.value;
      let cards = game.cards.map(rollValidator.updateWinners(roll, 'card'));
      roundData.bets = roundData.bets.map(rollValidator.updateWinners(roll, 'bonus'));
      return dbClient.updateItem(GAMES, {_id: game._id}, {
        $set: { cards: cards, finish: Date.now() },
        $push: {rounds: roundData }
      });
    })
    .then(() => dbClient.getCollection(GAMES, {_id: game._id}));
  }

  function startNextRound(game, roundData) {
    let roll = roundData.result;
    roundData.bets = roundData.bets.map(rollValidator.updateWinners(roll, 'bonus'));
    return dbClient.updateItem(GAMES_ACTIVE, {_id: game._id}, {$push: {rounds: roundData}})
      .then(() => dbClient.getCollection(GAMES_ACTIVE, {_id: game._id}));
  }

};
