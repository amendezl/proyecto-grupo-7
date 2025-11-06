import http from 'http';
import https from 'https';

// Export a programmatic proxy creator for tests or advanced usage.
export function createChaosProxy({ target, port = 9000, latency = 0, errorRate = 0, errorStatus = 500 }) {
  // We implement a minimal forwarder here to avoid using `http-proxy` which
  // triggers `util._extend` deprecation warnings on Node 22.

  function wait(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  const server = http.createServer(async (req, res) => {
    const roll = Math.random() * 100;
    if (roll < errorRate) {
      res.writeHead(errorStatus, { 'Content-Type': 'text/plain' });
      res.end(`Chaos injected error (status ${errorStatus})`);
      return;
    }

    if (latency > 0) await wait(latency);

    try {
      const forwardUrl = new URL(req.url, target);
      const isHttps = forwardUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      // Ensure Host header reflects target (changeOrigin behavior)
      const headers = { ...req.headers, host: forwardUrl.host };

      const proxyReq = client.request(forwardUrl, { method: req.method, headers }, (proxyRes) => {
        // copy status and headers
        const responseHeaders = { ...proxyRes.headers };
        // Node may include 'transfer-encoding' etc. We pass through as-is.
        res.writeHead(proxyRes.statusCode || 502, responseHeaders);
        proxyRes.pipe(res, { end: true });
      });

      proxyReq.on('error', (err) => {
        console.error('Proxy error:', err && err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'text/plain' });
          res.end('Bad gateway (proxy)');
        }
      });

      // Pipe request body
      req.pipe(proxyReq, { end: true });
    } catch (err) {
      console.error('Proxy setup error:', err && err.message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Proxy internal error');
      }
    }
  });

  return {
    listen: () => new Promise((resolve) => server.listen(port, resolve)),
    close: () => new Promise((resolve) => server.close(resolve)),
    server,
  };
}

export default createChaosProxy;
