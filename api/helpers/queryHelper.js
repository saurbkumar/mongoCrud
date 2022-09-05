const queryHooks = require('../helpers/queryHooks');
const allowedSortFields = new Set(queryHooks.mapping().sortFields);

module.exports = {
  transformMogoOrderBy: transformMogoOrderBy
};

function transformMogoOrderBy(sortBy) {
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
