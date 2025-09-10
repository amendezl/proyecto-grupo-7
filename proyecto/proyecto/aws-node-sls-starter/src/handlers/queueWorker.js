module.exports.process = async (event) => {
  for (const record of event.Records || []) {
    try {
      const body = JSON.parse(record.body || "{}");
      console.log("🔧 Processing message:", body);
      // TODO: Add your business logic here
    } catch (err) {
      console.error("❌ Error parsing/processing:", err);
      // Re-throw so the batch is retried for failed messages
      throw err;
    }
  }
  return;
};
