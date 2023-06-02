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

function transFormProjection(projection) {
  if (!projection) {
    return '';
  }
  projection.split(' ').forEach((field) => {
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

function generatePaginationLinks(url, totalDocs) {
  const links = {
    next: '',
    previous: '',
    last: ''
  };
  let hrefLast = new URL(url);
  let hrefPrevious = new URL(url);
  let hrefNext = new URL(url);

  const top = hrefLast.searchParams.get('$top');
  const skip = hrefLast.searchParams.get('$skip');

  // next link
  hrefNext.searchParams.set('$top', top);
  hrefNext.searchParams.set('$skip', skip + top);
  links.next = hrefNext.href;

  // previous link
  // only top and skip will change
  // next = top=top, skip = skip + top, last = totalDocs - (totalDocs%top)
}
