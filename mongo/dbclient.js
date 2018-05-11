

module.exports = (function() {

  'use strict';

  const MongoClient = require('mongodb').MongoClient;
  const ObjectId = require('mongodb').ObjectId;
  const { PROTOCOL, HOST, PORT, DATABASE, ERRORS } = require('./config');

  if (process.env.NODE_ENV !== 'production') { /* seed data if necessary */ }

  const _dbClient = {

    getDbAccess: function accessDb() {
      return MongoClient.connect(`${PROTOCOL}://${HOST}:${PORT}`);
    },

    getDocById: function getDocById(collectionName, rawId, projection) {
      const getClient = this.getDbAccess.bind(this);
      return new Promise(function(resolve, reject) {
        if (! collectionName ) reject(new Error(ERRORS.NO_COL));
        getClient().then(client => {
          const db = client.db(DATABASE);
          db.collection(collectionName)
            .find({_id: ObjectId(rawId)})
            .project(projection)
            .toArray()
            .then(colData => colData.length > 0 ? colData[0] : null)
            .then(resolve)
            .catch(reject);
        }).catch(reject);
      });
    },

    getCollection: function getCollection(collectionName, query) {
      const that = this;
      return new Promise(function(resolve, reject) {
        if (! collectionName ) reject(new Error(ERRORS.NO_COL));
        that.getDbAccess().then(client => {
          const db = client.db(DATABASE);
          const collectionData = db.collection(collectionName).find(query);
          collectionData.toArray()
            .then(resolve)
            .catch(reject);
        })
        .catch(reject);
      });
    },

    insertItem: function insert(collectionName, data) {
      const that = this;
      return new Promise(function(resolve, reject) {
        if (! collectionName || ! data) reject(new Error('collection name and/or insert data missing'));
        that.getDbAccess().then(client => {
          const db = client.db(DATABASE);
          const insertPromise = db.collection(collectionName).save(data);
          insertPromise
            .then(resolve)
            .catch(reject);
        })
        .catch(reject);
      });
    },

    removeItem: function remove(collectionName, data) {
      const that = this;
      return new Promise(function(resolve, reject) {
        if (! (collectionName && data))
          reject(new Error('collection name and/or remove data missing'));
        if (! data._id)
          reject(new Error('No ID for delete'));
        that.getDbAccess().then(client => {
          data._id = ObjectId(data._id);
          const db = client.db(DATABASE);
          const removeProm = db.collection(collectionName).deleteOne(data);
          removeProm
            .then(resolve)
            .catch(reject);
        })
        .catch(reject);
      });
    },

    getAndRemoveItem: function getAndRemove(collectionName, query) {
      const getDbClient = this.getDbAccess.bind(this);
      return new Promise(function(resolve, reject) {
        getDbClient().then(client => {
          const db = client.db(DATABASE);
          db.collection(collectionName).findOneAndDelete(query)
            .then(resolve)
            .catch(reject);
       });
      });
    },

    updateItem: function update(collectionName, data) {
      const that = this;
      return new Promise(function(resolve, reject) {
        if (! (collectionName && data))
          reject(new Error('collection name and/or update data missing'));
        if (! data._id)
          reject(new Error('No ID for update'));

        that.getDbAccess().then(client => {
          const
            query = { _id: ObjectId(data._id)},
            updateData = {};

          Object.keys(data).reduce((acc, key) => {
            if (key !== '_id')
              acc[key] = data[key];
              return acc;
            }, updateData);

          const db = client.db(DATABASE);
          const updateProm = db.collection(collectionName).update(query, updateData);
          updateProm
            .then(resolve)
            .catch(reject);
        })
        .catch(reject);
      });
    }
  };

  return _dbClient;

})();
