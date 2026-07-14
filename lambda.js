const serverless = require('serverless-http');
const app = require('./server');

// This is the entry point AWS Lambda invokes. serverless-http adapts the
// Express app to the Lambda/API Gateway event format so the exact same
// route code runs identically locally and in the cloud.
module.exports.handler = serverless(app);
