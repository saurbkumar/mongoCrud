// for live and readiness probe
const mongoDBHelper = require('../helpers/mongoHelper');
const components = [
  {
    name: 'mongoDB',
    //   live: mongoDBHelper.ready,
    ready: mongoDBHelper.ready
  }
];
function getComponents() {
  return components;
}
module.exports = {
  getComponents: getComponents
};
