const queryHooks = require('../helpers/queryHooks');
const logger = require('../../logger')(__filename);

const filter = require('./mongoFilter');

const allowedSortFields = new Set(queryHooks.mapping().sortFields);

module.exports = {
  transformMogoSortBy: transformMogoSortBy,
  transformMongoQuery: transformMongoQuery
};

function transformMogoSortBy(sortBy) {
  let sortConfig = {};
  if (!sortBy) {
    return sortConfig;
  }
  // +age
  sortBy.split(' ').forEach((field) => {
    const sortDirection = field.substring(0, 1);
    const sortfield = field.substring(1);
    if (sortDirection != '+' && sortDirection != '-') {
      throw {
        message: `${sortDirection} direction is not allowed. Bad request`,
        statusCode: 400
      };
    }

    if (!allowedSortFields.has(sortfield)) {
      throw {
        message: `${sortfield} is not allowed for the sorting. Bad request`,
        statusCode: 400
      };
    }

    sortConfig[sortfield] = sortDirection === '+' ? 'asc' : 'desc';
  });
  return sortConfig;
}

function transformMongoQuery(query) {
  let transformedQuery = {};
  if (query) {
    try {
      transformedQuery = filter.parse(query);
    } catch (error) {
      const messaage = error.message || 'bad query';
      logger.error(
        `transformMongoQuery: error while parsing query, error: ${messaage}`
      );
      throw { messaage: messaage, statusCode: 400 };
    }
  }
  return transformedQuery;
}
