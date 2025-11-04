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

Environment variables are supported as fallbacks when running locally or inside Docker:

| Variable | Purpose | Default |
|----------|---------|---------|
| `CHAOS_TARGET` | Upstream URL (required if `--target` flag omitted) | — |
| `CHAOS_PORT` | Listening port (maps to `--port`) | `9000` |
| `CHAOS_LATENCY` | Injected latency in ms | `0` |
| `CHAOS_ERROR_RATE` | Percentage of failed requests | `0` |
| `CHAOS_ERROR_STATUS` | HTTP status for injected failures | `500` |

### Smoke test

Run the bundled smoke test (used by the deployment pipeline) which spins up an in-memory upstream server and validates the proxy path:

```powershell
npm run smoke
```

### Docker usage

Build and run the proxy as a container. Provide configuration via environment variables.

```powershell
docker build -t chaos-proxy .
docker run --rm -p 9000:9000 `
  -e CHAOS_TARGET=http://host.docker.internal:3000 `
  -e CHAOS_LATENCY=250 `
  -e CHAOS_ERROR_RATE=5 `
  chaos-proxy
```

`host.docker.internal` lets the container reach services running on the host machine when using Docker Desktop. Adjust the env vars to suit your experiment.

3. Point your client (or browser) at `http://localhost:9000` instead of the upstream. The proxy will forward requests to the configured upstream but will sometimes delay responses or return injected errors.

Safety and guidance
- This is meant for development/staging only. Do NOT run aggressive experiments against production without approvals and safety plans.
- Keep error rates and latency conservative during initial tests (e.g., 5-10%).
- Use `--show-config` to verify configuration before running.

Next steps (I can implement these if you want):
- Additional attack types: CPU/memory stressor, kill/restart process, DNS failures.
- CI integration to run short chaos experiments in pre-production.
- Metrics collection and auto rollback (connect to Prometheus or send to a webhook).
