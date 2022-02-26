const mongoHelper = require('../helpers/mongoHelper');

const memoryCacheModel = require('../models/memoryCacheModel');
const mongoModel = require('../models/mongoDbModel');

module.exports = {
  getUser: getUser,
  createUser: createUser,
  updateUser: updateUser,
  deleteUser: deleteUser,
  getUsers: getUsers,
  deleteUsers: deleteUsers,
  start: mongoHelper.connect,
  close: mongoHelper.close
};

async function getUser(id) {
  let result = memoryCacheModel.getObject(id);
  if (!result) {
    result = await mongoModel.getUser(id);
    if (result) memoryCacheModel.createObject(id, result.toJSON());
  }
  return result;
}

async function createUser(user) {
  const result = await mongoModel.createUser(user);
  memoryCacheModel.createObject(result.get('id'), result.toJSON());
  return result;
}

async function updateUser(id, user) {
  const result = await mongoModel.updateUser(id, user);
  if (result) memoryCacheModel.updateObject(id, result.toJSON());
  return result;
}

async function deleteUser(id) {
  memoryCacheModel.deleteObject(id);
  return mongoModel.deleteUser(id);
}
async function getUsers(top, skip) {
  let result = mongoModel.getUsers(top, skip);
  return result;
}

async function deleteUsers() {
  memoryCacheModel.clear();
  return mongoModel.deleteUsers();
}
