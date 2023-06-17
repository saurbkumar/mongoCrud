// for live and readiness probe
const mongoDBHelper = require('../helpers/mongoHelper');
const components = [
  {
    name: 'mongoDB',
    live: mongoDBHelper.live,
    ready: mongoDBHelper.ready
  }
];
function getComponents() {
  let liveComponents = [];
  let readyComponents = [];
  for (let component of components) {
    if (component.live) {
      liveComponents.push([component.name, component.live]);
    }
    if (component.ready) {
      readyComponents.push([component.name, component.ready]);
    }
  }
  return {
    getLiveComponents: function () {
      return liveComponents;
    },
    getReadyComponents: function () {
      return readyComponents;
    }
  };
}
module.exports = {
  getComponents: getComponents
};
