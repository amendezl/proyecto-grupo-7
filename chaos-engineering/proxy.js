import http from 'http';
import httpProxyPkg from 'http-proxy';
const { createProxyServer } = httpProxyPkg;

// Export a programmatic proxy creator for tests or advanced usage.
export function createChaosProxy({ target, port = 9000, latency = 500, errorRate = 0, errorStatus = 500 }) {
  const proxy = createProxyServer();

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

    proxy.web(req, res, { target, changeOrigin: true }, (err) => {
      console.error('Proxy error:', err && err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad gateway (proxy)');
      }
    });
  });

  return {
    listen: () => new Promise((resolve) => server.listen(port, resolve)),
    close: () => new Promise((resolve) => server.close(resolve)),
    server,
  };
}

export default createChaosProxy;
