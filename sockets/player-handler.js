// Player IO Socket handler

module.exports = function applyPlayerHandlers(app, playersIO, dealersIO, socket) {

  const dbClient = require('../mongo/dbclient.js');
  const {P_ACTIVE, P_PENDING, T_ACTIVE} = require('./config');


  // const cookies = (socket.handshake.headers.cookie.split(';') || [])
  //   .map(x => x.trim())
  //   .reduce((a, nxt) => {
  //     let parts = nxt.split('=');
  //     a[parts[0]] = parts[1];
  //     return a;
  //   }, {});
  //
  // if (cookies.user && cookies.user.startsWith('temp')) {
  //
  //   return require('../mongo/dbclient').insertItem(P_ACTIVE, {})
  //     .then(result => )
  //   cookies.user = cookies.user.slice(5);
  // }
  //
  // let newCookie = Object.keys(cookies).reduce((a, nxt) => {
  //   a += `${nxt}=${cookies[nxt]}; `;
  //   return a;
  // }, '');
  // console.log('newCookie', newCookie);
  // socket.handshake.headers.cookie = newCookie;

  socket.on('join:table', ({tableId, userId}) => {
    Promise.resolve()
      // stop a player from trying to buy into more than one table
      .then( () => {
        if (Object.keys(socket.rooms).length > 1)
          throw new Error('Please cashout from your current table.');
        return dbClient.getCollection(T_ACTIVE, {tableName: tableId});
      })
      // stop a player from trying to buy into an inactive table
      .then( result => {
        if (result.length < 1)
          throw new Error('Cannot join a table without a dealer');
        // pass on the requested active table
        return result[0];
      })
      // alert the dealer of the requested table that there is a pending player buyin,
      //  and add the user to the pending-players table.
      .then( tableData => {
        let pendingPlayer = {userId, socketId:socket.id, tableId};
        dbClient.insertItem(P_PENDING, pendingPlayer);
        dealersIO.to(tableData.dealerSocket).emit('player:buyin', pendingPlayer);
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

  socket.on('amt:confirmed', amt => {
    console.log('player confirms $: ' + amt);
  });

  socket.on('amt:dispute', (dealer, amt) => {
    console.log('you got some splaining to do: ' + dealer);
  });
};
