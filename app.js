const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const config = require('config');
const SwaggerParser = require('@apidevtools/swagger-parser');
const OpenApiValidator = require('express-openapi-validator');

const swaggerDocument = require('./api/swagger/swagger.json');
const syncService = require('./api/services/syncService');

const prometheusHelper = require('./api/helpers/prometheusHelper');
const logger = require('./logger')(__filename);

const validateResponses = config.App.validateResponses;
const allowUnknownQueryParameters = config.App.validateResponses;
const port = config.App.port;
const appName = config.App.name;

const swaggerAttribures = {}; // map for swagger attributes

module.exports = {
  app: app,
  start: syncService.start,
  stop: syncService.stop
};
function getSwaggerPath(path, verb) {
  path.split(appName)[0];
  const pathArray = path.split(appName);
  const version = pathArray[0];
  const basePath = pathArray[1];
  return `${version}${verb.toLocaleLowerCase()}${basePath.split('/').length}`;
}
app.use(cors());

app.use(function (req, res, next) {
  // get the request path
  const reqPath = getSwaggerPath(req.url, req.method);
  // attach swagger attr to the locals
  const attr = swaggerAttribures[`${reqPath}`];

  // store the timer to locals
  req.app.locals = {
    prometheusTimer: startTimer(),
    swagger: attr
  };

  if (
    req?.app?.locals?.swagger &&
    req?.app?.locals?.swagger['x-dont-log'] == false
  ) {
    logger.info(`${req.url}`, { method: req.method, action: 'Start' });
  }
  next();
});

function startTimer() {
  return prometheusHelper.getRequestTimer().startTimer();
}

function stopTimer(prometheusTimer, path, code, method) {
  // cleanup path - remove query parameter
  prometheusTimer({
    code: code,
    method: method,
    path: path
  });
}
app.use(function (req, res, next) {
  req.headers['x-correlation-id']; // TODO : correlationId

  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: false }));

// check swagger document : if not valid throw error and do not start application
SwaggerParser.validate(swaggerDocument, (err) => {
  if (err) {
    logger.error(err);
    throw err;
  }
});

app.use(`/${appName}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// validation middleware
app.use(
  OpenApiValidator.middleware({
    apiSpec: `${__dirname}/api/swagger/swagger.json`,
    validateRequests: {
      allowUnknownQueryParameters: allowUnknownQueryParameters
    },
    validateResponses: validateResponses // false by default
  })
);

// eslint-disable-next-line no-unused-vars
app.use(function (err, req, res, next) {
  // for error handling

  logger.info(`${req.url}`, {
    statusCode: res.statusCode,
    method: req.method,
    action: 'End'
  });

  if (req?.app?.locals?.prometheusTimer) {
    stopTimer(
      req.app.locals.prometheusTimer,
      req.app?.locals?.swagger?.path || req.path,
      err?.status || 500,
      req.method
    );
  }

  res.status(err?.status || 500).json({
    message: err.message,
    errors: err.errors
  });
});

app.use(function (req, res, next) {
  res.on('finish', function () {
    // for request metrics
    if (req?.app?.locals?.prometheusTimer) {
      stopTimer(
        req.app.locals.prometheusTimer,
        app?.locals?.swagger?.path || req.url,
        res.statusCode,
        req.method
      );
    }
    // for request logging
    if (
      req?.app?.locals?.swagger &&
      !req.app.locals.swagger['x-dont-log'] === false
    ) {
      logger.info(`${req.url}`, {
        statusCode: res.statusCode,
        method: req.method,
        action: 'End'
      });
    }
  });
  next();
});

const ignoreSwaggerAttr = ['parameters', 'requestBody', 'responses'];
const v1BasePath = swaggerDocument.servers[0].url; // get the api version, this is specific to swagger
// read swagger file and attach all path
for (const [path, pathAttributes] of Object.entries(swaggerDocument.paths)) {
  const controllerId = pathAttributes['x-controller'];
  let controllerPath = `${__dirname}/api/controllers/${controllerId}`;
  let controller = require(controllerPath);
  for (const [verb, value] of Object.entries(pathAttributes)) {
    if (verb == 'x-controller') continue;
    const operationId = value?.operationId;
    let pathPattern = [];
    path.split('/').forEach((element) => {
      // convert : /path1/{id1}/path2/{id2}/path3 ==> /path1/:id1/path2/id2/path3
      if (element.length) {
        if (element.endsWith('}') && element.startsWith('{')) {
          pathPattern.push(`:${element.slice(1, -1)}`); // remove {} and add :
        } else {
          pathPattern.push(element);
        }
      }
    });
    // adding path dynamically like app.get("/path1/:id1/path2/:id2/path3", helloController.hello1);
    const expressPath = pathPattern.join('/');
    app[`${verb}`](
      `${v1BasePath}/${expressPath}`,
      controller[`${operationId}`]
    );

    // create a map for swagger file property lookup for every request
    // key is verb and path length, the path length is unique for a given verb
    const swaggerAttrValue = {};
    for (const [attribute, swaggerVal] of Object.entries(value)) {
      if (!ignoreSwaggerAttr.includes(attribute)) {
        swaggerAttrValue[attribute] = swaggerVal;
      }
    }
    swaggerAttrValue['path'] = `${v1BasePath.split(appName)[0]}${expressPath}`;
    const swaggerPath = `${v1BasePath}/${expressPath}`; // version is also needed
    swaggerAttribures[getSwaggerPath(swaggerPath, verb)] = swaggerAttrValue;
  }
}

if (require.main === module) {
  app.listen(port, async () => {
    logger.info(`Example app listening at http://localhost:${port}`);
    logger.info(`Starting background services`);
    await syncService.start(config.Database);
  });
}
