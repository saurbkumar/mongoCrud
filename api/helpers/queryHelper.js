const querystring = require('querystring');

const queryHooks = require('../helpers/queryHooks');
const logger = require('../../logger')(__filename);

const filter = require('./mongoFilter');

const allowedSortFields = new Set(queryHooks.mapping().sortFields);

module.exports = {
  transformMogoSortBy: transformMogoSortBy,
  transformMongoQuery: transformMongoQuery,
  transFormProjection: transFormProjection,
  generatePaginationLinks: generatePaginationLinks
};

function transformMogoSortBy(sortBy) {
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

function transFormProjection(projection) {
  if (!projection) {
    return '';
  }
  projection
    .split(' ')
    .filter((field) => field) // remove addtional spaces, all the spaces will be false
    .forEach((field) => {
      const projectionType = field.substring(0, 1);
      if (projectionType != '-') {
        throw {
          message: `${projectionType} is not allowed. only '-' is allowed Bad request`,
          statusCode: 400
        };
      }
    });
  return projection;
}
/**
 *
 * @param {*} url Encoded URL string
 * @param {*} totalDocs total number of docs
 * @returns links object
 */
function generatePaginationLinks(url, totalDocs) {
  const links = {
    first: {
      href: ''
    },
    last: {
      href: ''
    },
    previous: {
      href: ''
    },
    next: {
      href: ''
    }
  };
  const _makeURL = function (basePath, queryParamMap) {
    return `${basePath}?${querystring.stringify(queryParamMap)}`;
  };
  let [basePath, queryParam] = url.split('?');

  const queryParamMap = querystring.parse(queryParam);
  let queryParamMapFirst = queryParamMap;
  let queryParamMapLast = queryParamMap;
  let queryParamMapNext = queryParamMap;
  let queryParamMapPrevious = queryParamMap;

  const top = parseInt(queryParamMap['$top']);
  const skip = parseInt(queryParamMap['$skip']);

  // first
  queryParamMapFirst['$top'] = top;
  queryParamMapFirst['$skip'] = 0;
  links.first.href = _makeURL(basePath, queryParamMapFirst);

  // last
  let skipForLastLink = 0;
  let quotient = Math.floor(totalDocs / top);
  let remainder = totalDocs % top;
  if (remainder == 0) {
    skipForLastLink = (quotient - 1) * top;
  } else {
    skipForLastLink = quotient * top;
  }
  queryParamMapLast['$top'] = top;
  queryParamMapLast['$skip'] = skipForLastLink;
  links.last.href = _makeURL(basePath, queryParamMapLast);

  // next link
  queryParamMapNext['$top'] = top;
  queryParamMapNext['$skip'] = skip + top;
  links.next.href = _makeURL(basePath, queryParamMapNext);

  // previous
  queryParamMapPrevious['$top'] = top;
  let skipForPreviousLink = skip > top ? skip - top : 0; // for the first page
  queryParamMapPrevious['$skip'] = skipForPreviousLink;
  links.previous.href = _makeURL(basePath, queryParamMapPrevious);

  return links;
}
