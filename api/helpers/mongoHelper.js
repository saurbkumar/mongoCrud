// Just for connection management

const mongoose = require('mongoose');

async function connect(dbConfig) {
  let config = {};
  if (dbConfig.user && dbConfig.password) {
    config = {
      user: dbConfig.user,
      pass: dbConfig.password
    };
  }
  if (dbConfig.name) {
    config['dbName'] = dbConfig.name;
  }
  await mongoose.connect(dbConfig.server, config);
}

async function close() {
  await mongoose.connection.close();
}

module.exports = {
  connect: connect,
  close: close
};
