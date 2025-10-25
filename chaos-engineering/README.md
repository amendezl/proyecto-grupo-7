# Chaos engineering module (minimal scaffold)

This folder contains a minimal, safe, and opt-in chaos engineering tool to help test the resilience of HTTP-based services by proxying traffic and injecting latency and error responses.

Key features
- Start a local proxy that forwards to an upstream service and can:
  - inject fixed latency (ms)
  - inject errors at a configurable rate (percentage) with configurable status code

Usage
1. Install dependencies inside this folder:

```powershell
cd chaos-engineering; npm install
```

2. Start the proxy (example):

```powershell
node index.js --target http://localhost:3000 --port 9000 --latency 300 --error-rate 10 --error-status 503
```

3. Point your client (or browser) at `http://localhost:9000` instead of the upstream. The proxy will forward requests to the configured upstream but will sometimes delay responses or return injected errors.

Safety and guidance
- This is meant for development/staging only. Do NOT run aggressive experiments against production without approvals and safety plans.
- Keep error rates and latency conservative during initial tests (e.g., 5-10%).
- Use `--show-config` to verify configuration before running.

Next steps (I can implement these if you want):
- Additional attack types: CPU/memory stressor, kill/restart process, DNS failures.
- CI integration to run short chaos experiments in pre-production.
- Metrics collection and auto rollback (connect to Prometheus or send to a webhook).
