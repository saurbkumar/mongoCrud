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

  let hrefFirst = new URL(url);
  let hrefLast = new URL(url);
  let hrefPrevious = new URL(url);
  let hrefNext = new URL(url);

  const top = parseInt(hrefLast.searchParams.get('$top'));
  const skip = parseInt(hrefLast.searchParams.get('$skip'));

  // first
  hrefFirst.searchParams.set('$top', top);
  hrefFirst.searchParams.set('$skip', 0);
  links.first.href = hrefFirst.href;

  // last --  fix needed for the edge cases
  let skipForLastLink = 0;
  let quotient = Math.floor(totalDocs / top);
  let remainder = totalDocs % top;
  if (remainder == 0) {
    skipForLastLink = (quotient - 1) * top;
  } else {
    skipForLastLink = quotient * top;
  }
  hrefLast.searchParams.set('$top', top);
  hrefLast.searchParams.set('$skip', skipForLastLink);
  links.last.href = hrefLast.href;

  // next link -- fix needed for the edge cases
  hrefNext.searchParams.set('$top', top);
  hrefNext.searchParams.set('$skip', skip + top);
  links.next.href = hrefNext.href;

  // previous --  fix needed for the edge cases
  hrefPrevious.searchParams.set('$top', top);
  let skipForPreviousLink = skip > top ? skip - top : 0; // for the first page
  hrefPrevious.searchParams.set('$skip', skipForPreviousLink);
  links.previous.href = hrefPrevious.href;

  return links;
}
