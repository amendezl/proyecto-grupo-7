module.exports.default = async (event) => {
  console.log('WebSocket message received', event.body);
  return { statusCode: 200, body: 'Message received' };
};
