module.exports = {
  mapping: mapping
};

function mapping() {
  return {
    sortFields: ['name', 'age', 'address', 'country'] // all the allowed fields for which sorting is valid
  };
}
