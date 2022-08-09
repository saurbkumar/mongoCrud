const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const config = require('config');
const SwaggerParser = require('@apidevtools/swagger-parser');
const OpenApiValidator = require('express-openapi-validator');

const swaggerDocument = require('./api/swagger/swagger.json');
const syncService = require('./api/services/syncService');

const logger = require('./logger')(__filename);

const v1BasePath = config.App.v1Path;
const validateResponses = config.App.validateResponses;
const allowUnknownQueryParameters = config.App.validateResponses;
const appName = config.App.name.split('-').join('');
const port = config.App.port;

const client = require('prom-client');

// Create a Registry to register the metrics
const register = new client.Registry();

client.collectDefaultMetrics({
  register: register,
  prefix: appName,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  labels: { NODE_APP_INSTANCE: process.env.NODE_APP_INSTANCE }
});

module.exports = {
  app: app,
  start: syncService.start,
  stop: syncService.stop
};
app.use(cors());

app.use(function (req, res, next) {
  logger.info(`${req.url}`, { method: req.method, action: 'Start' });
  next();
});

app.use(function (req, res, next) {
  // console.log('---start--in cors-' + als.get('id'));
  req.headers['x-correlation-id']; // correlationId

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

app.use(
  `/${config.App.name}/docs`,
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument)
);

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
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors
  });
});

app.use(function (req, res, next) {
  res.on('finish', function () {
    logger.info(`${req.url}`, {
      statusCode: res.statusCode,
      method: req.method,
      action: 'End'
    });
  });
  next();
});

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
          pathPattern.push(`:${element.slice(1, -1)}`); // remove {}
        } else {
          pathPattern.push(element);
        }
      }
    });
    // adding path dynamically like app.get("/v1/path1/:id1/path2/:id2/path3", helloController.hello1);
    app[`${verb}`](
      `${v1BasePath}/${pathPattern.join('/')}`,
      controller[`${operationId}`]
    );
    const httpRequestTimer = new client.Histogram({
      name: operationId,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10] // 0.1 to 10 seconds
    });
    // Register the histogram
    register.registerMetric(httpRequestTimer);
  }
}

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
});

if (require.main === module) {
  app.listen(port, async () => {
    logger.info(`Example app listening at http://localhost:${port}`);
    logger.info(`Starting background services`);
    await syncService.start(config.Database);
  });
}
