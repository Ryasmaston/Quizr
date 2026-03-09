const dotenv = require("dotenv");
dotenv.config({ path: "./.env.test", override: true });

/** @type {import('jest').Config} */
const config = {
  verbose: true, // Give more useful output
  maxWorkers: 1, // Make sure our tests run one after another
};

module.exports = config;
