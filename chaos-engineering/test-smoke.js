import http from 'http';
import createChaosProxy from './proxy.js';

// Small smoke test:
// 1) start a simple upstream server that returns 200 OK
// 2) start the chaos proxy that forwards to the upstream but injects latency and a small error rate
// 3) make a few requests and print results

async function startUpstream(port = 3001) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('upstream ok');
    });
    server.listen(port, () => resolve(server));
  });
}

async function run() {
  const upstreamPort = 3001;
  const proxyPort = 3002;

  const upstream = await startUpstream(upstreamPort);
  console.log('Upstream running on', upstreamPort);

  const proxy = createChaosProxy({ target: `http://localhost:${upstreamPort}`, port: proxyPort, latency: 100, errorRate: 20, errorStatus: 503 });
  await proxy.listen();
  console.log('Proxy running on', proxyPort);

  // make a few requests
  for (let i = 0; i < 8; i++) {
    const res = await fetch(`http://localhost:${proxyPort}/test${i}`);
    console.log(i, res.status, await res.text());
  }

  await proxy.close();
  upstream.close();
  console.log('Smoke test finished');
}

run().catch((err) => {
  console.error('Smoke test failed', err);
  process.exit(1);
});
