module.exports.hello = async () => {
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ok: true,
      message: "Hello from Lambda 👋",
      time: new Date().toISOString()
    })
  };
};
