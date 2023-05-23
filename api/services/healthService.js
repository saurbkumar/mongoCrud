const logger = require('../../logger');
const healthModel = require('../models/healthModel');

module.exports = {
  getLive: getLive,
  getReady: getReady
};
const healthComponents = healthModel.getComponents();
let liveComponents = [];
let readyComponents = [];
for (let component of healthComponents) {
  if (component.live) {
    liveComponents.push([component.name, component.live]);
  }
  if (component.ready) {
    readyComponents.push([component.name, component.ready]);
  }
}

async function getLive() {
  if (liveComponents.length == 0) {
    return true;
  }
  let promises = [];
  for (let liveService of liveComponents) {
    promises.push(liveService[1]); // first is service name, second is the promise
  }
  let result = false;
  try {
    await Promise.all(promises); // fail fast behaviour
    result = true;
  } catch (error) {
    logger.error(`getLive: Error in liveness:`, error);
  }
  return result;
}

async function getReady() {
  let result = {
    status: 'App is healthy',
    components: [],
    isHealthy: true
  };

  if (readyComponents.length == 0) {
    return result;
  }
  let promises = [];
  for (let readyService of readyComponents) {
    promises.push(readyService[1]);
  }
  try {
    const healtCompResults = await Promise.allSettled(promises); // get result of each promise
    for (const [index, promiseResp] of healtCompResults.entries()) {
      if (!promiseResp.value.status) {
        result.isHealthy = false;
      }
      result.components.push({
        // all helper should handel the error properly, and should not throw error
        status: promiseResp.value.status, // true or false
        message: promiseResp.value.message,
        name: readyComponents[index].name // service name
      });
    }
  } catch (error) {
    // just for fail check, it should not come to catch block
    logger.error(`getLive: Error in liveness:`, error);
  }
  return result;
}
