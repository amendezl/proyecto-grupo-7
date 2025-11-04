#!/usr/bin/env node
import { Command } from 'commander';
import httpProxyPkg from 'http-proxy';
const { createProxyServer } = httpProxyPkg;
import express from 'express';

const program = new Command();

program
  .description('Start an HTTP proxy that can inject latency and error responses for resilience testing')
  .option('-t, --target <url>', 'Target upstream server URL (e.g. http://localhost:3000). Falls back to CHAOS_TARGET env var')
  .option('-p, --port <number>', 'Port for the proxy to listen on. Falls back to CHAOS_PORT env var', 9000)
  .option('-l, --latency <ms>', 'Fixed latency to inject (ms). Falls back to CHAOS_LATENCY env var', 0)
  .option('-e, --error-rate <percent>', 'Percentage of requests to fail (0-100). Falls back to CHAOS_ERROR_RATE env var', 0)
  .option('-s, --error-status <code>', 'HTTP status code to return for injected errors. Falls back to CHAOS_ERROR_STATUS env var', 500)
  .option('--show-config', 'Print resolved configuration and exit')
  .parse(process.argv);

const opts = program.opts();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const target = opts.target ?? process.env.CHAOS_TARGET;
const port = toNumber(opts.port ?? process.env.CHAOS_PORT, 9000);
const latency = toNumber(opts.latency ?? process.env.CHAOS_LATENCY, 0);
const errorRate = Math.min(100, Math.max(0, toNumber(opts.errorRate ?? process.env.CHAOS_ERROR_RATE, 0)));
const errorStatus = toNumber(opts.errorStatus ?? process.env.CHAOS_ERROR_STATUS, 500);

if (opts.showConfig) {
  console.log({ target, port, latency, errorRate, errorStatus });
  process.exit(target ? 0 : 1);
}

if (!target) {
  console.error('Error: target upstream URL is required (pass --target or set CHAOS_TARGET).');
  process.exit(1);
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
