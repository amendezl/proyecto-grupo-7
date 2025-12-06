const express = require('express');

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/devops/status', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    services: [
      { name: 'database', status: 'healthy', details: {} },
      { name: 'websocket', status: 'healthy', details: {} },
      { name: 'queue', status: 'healthy', details: {} }
    ]
  });
});

// fallback for other API health checks
app.get('/*', (req, res) => {
  res.status(200).json({ ok: true, path: req.path });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Mock API listening on http://localhost:${port}`);
  });
}

module.exports = app;
