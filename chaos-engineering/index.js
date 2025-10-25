#!/usr/bin/env node
import { Command } from 'commander';
import httpProxyPkg from 'http-proxy';
const { createProxyServer } = httpProxyPkg;
import express from 'express';

const program = new Command();

program
  .description('Start an HTTP proxy that can inject latency and error responses for resilience testing')
  .requiredOption('-t, --target <url>', 'Target upstream server URL (e.g. http://localhost:3000)')
  .option('-p, --port <number>', 'Port for the proxy to listen on', 9000)
  .option('-l, --latency <ms>', 'Fixed latency to inject (ms)', 0)
  .option('-e, --error-rate <percent>', 'Percentage of requests to fail (0-100)', 0)
  .option('-s, --error-status <code>', 'HTTP status code to return for injected errors', 500)
  .option('--show-config', 'Print resolved configuration and exit')
  .parse(process.argv);

const opts = program.opts();
const target = opts.target;
const port = Number(opts.port);
const latency = Number(opts.latency);
const errorRate = Math.min(100, Math.max(0, Number(opts.errorRate)));
const errorStatus = Number(opts.errorStatus);

if (opts.showConfig) {
  console.log({ target, port, latency, errorRate, errorStatus });
  process.exit(0);
}

const app = express();
const proxy = createProxyServer();

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

app.use(async (req, res) => {
  // Decide whether to inject an error
  const roll = Math.random() * 100;
  if (roll < errorRate) {
    // send an injected error and do not forward
    res.status(errorStatus).send(`Chaos injected error (status ${errorStatus})`);
    return;
  }

  if (latency > 0) await wait(latency);

  // Proxy the request to target
  proxy.web(req, res, { target, changeOrigin: true }, (err) => {
    // If upstream is unavailable, respond with 502 so tests can observe degraded behavior
    console.error('Proxy error:', err && err.message);
    if (!res.headersSent) res.status(502).send('Bad gateway (proxy)');
  });
});

app.listen(port, () => {
  console.log(`Chaos proxy listening on http://localhost:${port} -> ${target}`);
  console.log(`Injecting latency: ${latency}ms, errorRate: ${errorRate}%, errorStatus: ${errorStatus}`);
});
