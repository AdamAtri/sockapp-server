
module.exports = function(dbClient) {

  const USER_COLLECTION = 'sb-users';
  const UserRouter = require('express')();

  UserRouter.get('/(:id)?', (req, res) => {

    // TODO: replace this with a redirect to create account
    if (! req.params.id ) {
      dbClient.insertItem(USER_COLLECTION, {created: Date.now()})
        .then(result => {
          if (result.ops.length < 1) throw new Error('Failed to create user');
          result = result.ops[0];
          return dbClient.getDocById(USER_COLLECTION, result._id);
        }).then(result => {
          res.json(result);
        })
        .catch(err => {res.status(404).end(err.message);});
    }
    else {
      dbClient.getDocById(USER_COLLECTION, req.params.id)
        .then(result => {res.json(result);})
        .catch(err => {res.status(404).end(err.message);});
    }
  });

  return UserRouter;
};
