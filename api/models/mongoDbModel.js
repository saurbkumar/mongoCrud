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
    country: { type: String, index: true },
    isActive: { type: Boolean, index: true },
    metadata: { type: Object, index: true }
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
    address: user.address,
    country: user.country,
    isActive: user.isActive,
    metadata: user.metadata
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
  if (user.isActive != undefined) result.isActive = user.isActive;
  if (user.metadata) result.metadata = user.metadata;
  logger.debug(`updateUser: updated user: ${JSON.stringify(user)}`);
  return await result.save();
  // return user;
}

async function deleteUser(id) {
  logger.info(`deleteUser: removing user for Id: ${id}`);
  let result = await User.deleteOne({ _id: id }); // here not using write before read
  if (result.deletedCount != 1) {
    logger.error(`deleteUser: userId ${id} not found`);
    return false;
  }
  return true;
}
async function getUsers(top, skip, filter, sortBy, projection) {
  const sortConfig = queryHelper.transformMogoSortBy(sortBy);
  const filterConfig = queryHelper.transformMongoQuery(filter);
  const projectionConfig = queryHelper.transFormProjection(projection);
  logger.info(
    `getUsers: getting users, top: ${top}, skip: ${skip}, filter: ${filter}, sortBy: ${sortConfig}, projection: ${projection}`
  );

  let query = filterConfig;
  logger.debug(`getUsers: query: ${JSON.stringify(query)}`);
  const result = await User.find(query, [], {
    limit: top, // number of top document return
    skip: skip // number of doc to skip
  })
    .sort(sortConfig)
    .select(projectionConfig);

  // move this to pagination
  let totalDoc = await User.countDocuments(query).lean(); // find better way to do this, figure out in single query
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

async function deleteUsers(filter) {
  const filterConfig = queryHelper.transformMongoQuery(filter);
  logger.info(
    `deleteUsers: removing all users, for query: ${JSON.stringify(
      filterConfig
    )}`
  );
  let result = await User.deleteMany(filterConfig);
  return { count: result.deletedCount };
}

function copy(dbObj) {
  return dbObj.toJSON();
}
