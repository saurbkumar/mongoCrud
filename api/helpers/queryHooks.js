module.exports = {
  mapping: mapping
};
/**
 *
 * returns mappings
 * sortFields : contains all the fields sort is allowed
 * queryFiels : contains all the fields query filter is allowed
 *              allowed type is string, int, boolean and there are case senstive
 */
function mapping() {
  return {
    sortFields: ['name', 'age', 'address', 'country'], // all the allowed fields for which sorting is valid
    queryFiels: [
      { name: 'name', type: 'string' },
      { name: 'age', type: 'int' }
    ]
  };
}
