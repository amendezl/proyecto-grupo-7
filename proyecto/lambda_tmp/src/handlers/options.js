const { noContent } = require('../shared/utils/responses');

module.exports.handler = async (event) => {
  // Return a 204 No Content with CORS headers set by shared responses
  return noContent();
};
