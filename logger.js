const winston = require('winston');
const config = require('config');
const path = require('path');
const fs = require('fs');

const logOptions = {
  level: config.Log.level,
  silent: config.Log.silent,
  transports: [new winston.transports.Console()],
  format: winston.format.combine(
    winston.format.timestamp({
      colorize: false
    }),
    winston.format.json()
  ),
  defaultMeta: { service: config.App.name }
};
let logger = winston.createLogger(logOptions);

module.exports = function (fileName) {
  const name = path.basename(fileName);
  return {
    switchToFile: () => {
      try {
        fs.unlinkSync(fileName);
      } catch (error) {
        // Do Noting
      }
      const newLogOption = logOptions;
      newLogOption.transports = [
        new winston.transports.File({ filename: fileName })
      ];
      logger = winston.createLogger(newLogOption);
    },
    info: (message, meta) => {
      logger.info(message, mergeMeta({ file: name }, meta));
    },
    error: (message, meta) => {
      logger.error(message, mergeMeta({ file: name }, meta));
    },
    debug: (message, meta) => {
      logger.debug(message, mergeMeta({ file: name }, meta));
    },
    verbose: (message, meta) => {
      logger.verbose(message, mergeMeta({ file: name }, meta));
    }
  };
};

function mergeMeta(...objs) {
  return Object.assign({}, ...objs);
}
