// Just for connection management

const config = require('config');
const { Sequelize, DataTypes } = require('sequelize');

let sequelize;

async function connect() {
  sequelize = new Sequelize(
    config.Database.name,
    config.Database.user,
    config.Database.password,
    {
      host: config.Database.server,
      dialect: 'mysql',
      logging: config.Database.logging
    }
  );
}
async function close() {
  await sequelize.close();
}

module.exports = {
  sequelize: sequelize,
  dataTypes: DataTypes,
  connect: connect,
  close: close
};
