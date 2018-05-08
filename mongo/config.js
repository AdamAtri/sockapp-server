module.exports = (function() {
  const DbClientConfig = {
    PROTOCOL: 'mongodb',
    HOST: 'localhost',
    PORT: '28018',
    DATABASE: 'shooter-test',

    ERRORS: {
      NO_COL: 'The required "collectionName" was not provided.'
    }
  };

  return DbClientConfig;
})();
