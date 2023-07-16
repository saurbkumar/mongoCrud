const logger = require('../../logger')(__filename);

const queryHooks = require('../helpers/queryHooks');
const filter = require('./mongoFilter');

const allowedSortFields = new Set(queryHooks.mapping().sortFields);
const queryFields = new Set(
  queryHooks.mapping().queryFields.map((queryField) => queryField.name)
);

module.exports = {
  transformSortBy: transformMongoSortBy,
  transformProjection: transformMongoProjection,
  transformFilterQuery: transformFilterQuery
};

function transformMongoSortBy(sortBy) {
  let sortConfig = {};
  if (!sortBy) {
    return sortConfig;
  }

  sortBy
    .split(' ')
    .filter((field) => field) // remove addtional spaces, all the spaces will be false
    .forEach((field) => {
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
function transformMongoProjection(projection) {
  if (!projection) {
    return '';
  }
  let mongoProjection = [];
  let allProjectionType = new Set();
  const projectionFields = [];
  projection
    .split(' ')
    .filter((field) => field) // remove addtional spaces, all the spaces will be false
    .forEach((field) => {
      const projectionType = field[0];
      const projectionField = field.substring(1);
      allProjectionType.add(projectionType);
      if (projectionType != '-' && projectionType != '+') {
        throw {
          message: `${projectionType} is not allowed. only '+' and '-' are allowed Bad request`,
          statusCode: 400
        };
      }
      if (projectionType === '+') {
        mongoProjection.push(field.substring(1));
      } else {
        mongoProjection.push(field);
      }
      //
      if (!queryFields.has(projectionField)) {
        throw {
          message: `Random projections not allowed`,
          statusCode: 400
        };
      }
      projectionFields.push(projectionField);
    });
  // check if + and - are not mixed together
  if (allProjectionType.size > 1) {
    throw {
      message: `projection can not be mixed together, either use + or -`,
      statusCode: 400
    };
  }

  return mongoProjection.join(' ');
}

function transformFilterQuery(query) {
  let transformedQuery = {};
  if (query) {
    try {
      transformedQuery = filter.parse(query);
    } catch (error) {
      const messaage = error.message || 'bad query';
      logger.error(
        `transformQuery: error while parsing query, error: ${messaage}`
      );
      throw { messaage: messaage, statusCode: 400 };
    }
  }
  return transformedQuery;
}
