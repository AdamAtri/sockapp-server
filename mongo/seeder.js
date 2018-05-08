module.exports = function seed() {
  return new Promise(function(resolve, reject) {
    const { join } = require('path');
    const SEEDED_FILE = join(__dirname, '.seeded');
    const fs = require('fs');

    if (fs.existsSync(SEEDED_FILE)) {
      return resolve(true);
    }

    const DB_NAME = 'atrico-test';
    const COLL_NAME = 'atrico-users';
    const dbClient = require('./dbclient');
    dbClient.getDbAccess().then(client => {
      const data = require('./seed-data.json');
      const db = client.db(DB_NAME);
      db.collection(COLL_NAME).insertMany(data).then(() => {
        fs.writeFile(SEEDED_FILE, new Date().toLocaleString(), err => {
          if (err) { return reject(err); }
          return resolve(true);
        });
      }).catch(reject);
    }).catch(reject);
  });
}
