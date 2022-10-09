const mongoose = require('mongoose');

const mongoHelper = require('../helpers/mongoHelper');
const queryHelper = require('../helpers/queryHelper');

const logger = require('../../logger')(__filename);
const shortId = require('../helpers/shortId');

const userSchema = new mongoose.Schema(
  {
    _id: String,
    name: { type: String, index: true },
    age: { type: Number, index: true },
    address: { type: String, index: true },
    country: { type: String, index: true }
  },
  {
    minimize: false,
    timestamps: true,
    versionKey: '__v',
    id: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

const User = mongoose.model('User', userSchema);

module.exports = {
  getUser: getUser,
  createUser: createUser,
  updateUser: updateUser,
  deleteUser: deleteUser,
  getUsers: getUsers,
  deleteUsers: deleteUsers,
  copy: copy,
  start: mongoHelper.connect,
  close: mongoHelper.close
};

async function getUser(id) {
  logger.info(`getUser: getting user for Id: ${id}`);
  return await User.findById(id);
}

async function createUser(user) {
  const userData = await User.create({
    _id: shortId.generate(),
    name: user.name,
    age: user.age,
    address: user.address
  });
  logger.info(`createUser: creating user: ${JSON.stringify(user)}`);
  return userData;
}

async function updateUser(id, user) {
  logger.info(`updateUser: updating user for Id: ${id}`);
  let result = await User.findById(id);
  if (!result) {
    logger.error(`updateUser: userId ${id} not found`);
    return null;
  }
  if (user.age) result.age = user.age;
  if (user.address) result.address = user.address;
  if (user.name) result.name = user.name;
  logger.debug(`updateUser: updated user: ${JSON.stringify(user)}`);
  return await result.save();
  // return user;
}

async function deleteUser(id) {
  logger.info(`deleteUser: removing user for Id: ${id}`);
  let result = await User.deleteOne({ _id: id });
  if (result.deletedCount != 1) {
    logger.error(`deleteUser: userId ${id} not found`);
    return false;
  }
  return true;
}
async function getUsers(top, skip, filter, sortBy, projection) {
  const sortConfig = queryHelper.transformMogoSortBy(sortBy);
  const filterConfig = queryHelper.transformMongoQuery(filter);
  logger.info(
    `getUsers: getting users, top: ${top}, skip: ${skip}, filter: ${filter}, sortBy: ${sortConfig}, projection: ${projection}`
  );

  let query = filterConfig;
  const result = await User.find(query, [], {
    limit: top, // number of top document return
    skip: skip // number of doc to skip
  })
    .sort(sortConfig)
    .select(projection);

  // move this to pagination
  let totalDoc = await User.count({}).lean();
  if (totalDoc - skip > 0) {
    totalDoc = totalDoc - skip;
  } else {
    totalDoc = 0;
  }
  return {
    count: totalDoc,
    values: result
  };
}

async function deleteUsers() {
  logger.info(`deleteUsers: removing all users`);
  let result = await User.deleteMany({});
  return { count: result };
}

function copy(dbObj) {
  return dbObj.toJSON();
}
