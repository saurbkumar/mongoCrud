const healthService = require('../services/healthService.js');
const logger = require('../../logger.js')(__filename);

module.exports = {
  getLive: getLive,
  getReady: getReady
};

async function getLive(req, res) {
  try {
    const result = await healthService.getLive();
    const response = {
      status: 'ok'
    };
    if (result) {
      return res.json(result);
    } else {
      response.status = 'Error';
      return res.status(503).send(response);
    }
  } catch (error) {
    logger.error(`getUsers: Error while getLive: ${error}`);
    return res.status(error.statusCode || 500).send({
      message: error.message || 'Internal Server Error',
      statusCode: error.statusCode || 500
    });
  }
}

async function getReady(req, res) {
  try {
    const result = await healthService.getReady();
    const appReady = '';
    const response = {
      status: 'ok'
    };
    if (result) {
      return res.json(result);
    } else {
      response.status = 'Error';
      return res.status(503).send(response);
    }
  } catch (error) {
    logger.error(`getUsers: Error while getReady: ${error}`);
    return res.status(error.statusCode || 500).send({
      message: error.message || 'Internal Server Error',
      statusCode: error.statusCode || 500
    });
  }
}
