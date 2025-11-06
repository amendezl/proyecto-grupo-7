    # Chaos Module — Full Design & Runbook

    This document describes the chaos engineering module included in this repository. It explains what the module is, why it exists, what it does, how it works (implementation and data flow), the runtime configuration contract, recommended hypothesis-driven procedures to run experiments safely, and troubleshooting/runbook steps.

    Table of contents
    - Overview
    - Components and where they live
    - Runtime contract (configuration)
    - How it works (data flow)
    - What it tests (intention & hypothesis examples)
    - Step-by-step experiment procedure (safe, repeatable)
    - Quick runbook (commands & rollback)
    - Observability & success criteria
    - Troubleshooting
    - Extending the module

    ---

    ## Overview

    This module provides a minimal, pragmatic toolset for injecting two simple failure modes into your system:

    - Latency injection: add a fixed delay (milliseconds) to service responses.
    - Error injection: probabilistic HTTP errors (configurable HTTP status and percent).

    It targets two deployment patterns commonly present in this project:

    - Serverless Lambdas: middleware that wraps Lambda handlers and can short-circuit or delay responses.
    - HTTP services / EC2: an HTTP proxy or containerized agent that forwards requests to upstream servers while injecting faults.

    Goals:
    - Provide a safe, centrally-configurable way to enable/disable experiments (via AWS SSM Parameter Store).
    - Keep the implementation small and auditable so it can be run in staging and used as a canary for production readiness.
    - Enable hypothesis-driven experiments with clear rollback steps and low blast radius.

    Non-goals:
    - This module does not attempt to simulate network partitions, DNS failures, or deep stateful data corruption. It focuses on latency and simple error modes which are low-risk and high-value for most resilience checks.

    ---

    ## Components and where to find them

    - Local dev proxy
    - `chaos-engineering/index.js` — HTTP proxy CLI that injects latency/errors.
    - `chaos-engineering/test-smoke.js` — local smoke test that validates the proxy behavior.
    - `chaos-engineering/Dockerfile` — containerization for EC2/ECR.

    - Serverless middleware
    - `chaos-engineering/serverless/middleware.js` — `withChaos(handler, opts)` wrapper for Lambda functions.
    - `chaos-engineering/serverless/ssm-config.js` — small helper to get and cache config from SSM Parameter Store.

    - Config & automation
    - `chaos-engineering/set-ssm-config.js` — CLI script to put the JSON config into SSM.
    - `scripts/deploy-chaos.ps1` — helper to copy TF vars, optionally run terraform, run npm ci, and set the SSM parameter.
    - `.github/workflows/*` — example workflows to build/push the Docker image and update SSM (optional).

    - Terraform examples
    - `devops/infra/chaos_agent_example.tf` — shows how to start the container on EC2 via SSM Run Command.
    - `devops/infra/attach_labrole_policies.tf` — example to attach limited SSM/ECR permissions to `LabRole`.

    ---

    ## Runtime contract (configuration)

    Central control is a single JSON object stored in SSM Parameter Store (String) at a configured path (example `/proyecto-grupo-7/prod/chaos`). The module supports an environment variable fallback for quick local testing.

    Shape (example):

    ```
    {
    "enabled": true,
    "latency": 200,        // milliseconds
    "errorRate": 5,        // percentage 0..100
    "errorStatus": 503     // HTTP status code for injected error
    }
    ```

    Rules and behaviors:
    - `enabled: false` => middleware/proxy is a no-op (safe default).
    - `latency` only applies when `enabled` is true (middleware sleeps before handler/forward).
    - `errorRate` is interpreted probabilistically per request. If a request is selected for error injection, the middleware/proxy returns `errorStatus` immediately (short-circuited) instead of performing the normal operation.
    - `errorRate` must be an integer from 0 to 100. 0 = no injected errors; 100 = every request becomes an error.

    Caching & refresh:
    - The serverless helper caches the config in memory (to avoid SSM throttling). For immediate changes you can design the Lambda to refresh on each cold start or add a short TTL; the provided helper uses caching but can be changed to poll or be invalidated.

    ---

    ## How it works (data flow)

    Serverless middleware mode:
    1. On Lambda invocation, `withChaos` fetches config from SSM (or env) using `ssm-config.js` which caches values.
    2. If `enabled` is false, `withChaos` simply calls the wrapped handler and returns its response.
    3. If `enabled` is true, `withChaos` generates a random number and compares it to `errorRate`.
    - If the random test indicates an error: `withChaos` returns a response with `errorStatus` immediately (and optionally logs an event). The real handler is not executed.
    - Otherwise, `withChaos` awaits the configured `latency` (ms), then calls the real handler and returns its response.

    Proxy mode (HTTP agent):
    1. The local or containerized proxy listens for incoming HTTP requests and proxies them to configured upstream.
    2. For each request, the proxy chooses to inject an error (probabilistically) or delay by `latency`. If injecting an error, it returns the configured `errorStatus` and a short message.
    3. If not injecting an error, it forwards the request to the upstream and returns the upstream response.

    SSM control plane:
    - `set-ssm-config.js` writes the JSON parameter to SSM. CI workflows or a manual operator can call this to toggle tests and modify intensity.

    Deployment for EC2:
    - Build Docker image (from `chaos-engineering/Dockerfile`), push to ECR, and start the container on target instances via SSM Run Command (or other orchestration). Terraform examples are included to help attach necessary policies to the instance role or to create SSM documents.

    ---

    ## What it tests (intent & typical hypotheses)

    Primary intentions:
    - Validate that client libraries & services behave correctly when downstream services are slow or return intermittent errors (retries, backoffs, idempotency, timeouts).
    - Validate that degradation strategies (caching, fallback logic, circuit-breakers) protect user-facing functionality.
    - Validate that monitoring and alerting detect real issues and that on-call flows are reasonable.

    Example test hypotheses:
    - Latency hypothesis: "If downstream latency increases by 200ms, our 95th percentile end-to-end latency remains below 800ms due to caching and client-side backoff." (Success metric: p95 < 800ms for 10 minutes.)
    - Error hypothesis: "If 5% of calls to payment-service return 503, overall user-facing success remains > 99% because of retries and fallback handling." (Success metric: user success rate >= 99%.)
    - Circuit-breaker hypothesis: "If error rate hits 40% for 2 minutes, the circuit breaker opens and avoids cascading failures; overall system error rate reduces within 1 minute." (Success metric: downstream call volume drops and system unavailability does not increase.)

    ---

    ## Step-by-step experiment procedure (safe, repeatable)

    1. Plan
    - Define hypothesis, scope (which functions/instances), duration, and success criteria.
    - Announce to team / on-call and schedule a time.

    2. Baseline collection
    - Collect normal metrics for 5–15 minutes: success rate, latency percentiles, retries, CPU, memory.

    3. Small test (canary)
    - Limit blast radius: select a single function or a subset of instances.
    - Start with conservative intensity (errorRate 1–5%, latency 50–200ms).
    - Duration: 5–10 minutes.

    4. Observe
    - Monitor metrics, traces, alarms.
    - Watch for unexpected behavior or alarm storms.

    5. Ramp or stop
    - If metrics remain within success bounds, you may ramp intensity gradually.
    - If metrics breach success criteria or unexpected cascades occur, immediately roll back.

    6. Rollback
    - Flip SSM: set `enabled` to `false` or `errorRate` to `0`.
    - If running a container agent on EC2, stop the container via SSM Run Command.

    7. Post-mortem
    - Record observations, root-cause of any failures, and remediation steps.

    ---

    ## Quick runbook (commands)

    Prereqs: AWS CLI configured with credentials, Node.js installed.

    Set a safe test parameter (local / staging):

    ```powershell
    # from repo root
    cd chaos-engineering
    npm ci
    node set-ssm-config.js --name "/proyecto-grupo-7/prod/chaos" --value '{ "enabled": true, "latency": 200, "errorRate": 5, "errorStatus": 503 }' --type String --region us-east-1
    ```

    Local proxy smoke test (no AWS needed):

    ```powershell
    cd chaos-engineering
    npm ci
    node test-smoke.js
    ```

    Rollback immediately (via SSM):

    ```powershell
    node set-ssm-config.js --name "/proyecto-grupo-7/prod/chaos" --value '{ "enabled": false, "latency": 0, "errorRate": 0, "errorStatus": 503 }' --type String --region us-east-1
    ```

    If you deployed a container to EC2 via SSM Run Command, stop it with another Run Command or via your orchestration.

    ---

    ## Observability & success criteria

    Suggested metrics to monitor during experiments:
    - Request success rate (2xx vs 5xx), per minute and per function/service.
    - Latency percentiles (p50/p95/p99) end-to-end and per dependent call.
    - Retry counts and retry success rates.
    - Invocation/throughput rates and downstream call counts.
    - Infrastructure resource usage (CPU, memory) to spot overload.
    - Alarms & on-call pages triggered.

    Success criteria are experiment-specific; always codify them before starting (e.g., "p95 < 800ms and error rate < 1% during the 10-minute window").

    ---

    ## Troubleshooting

    - SSM write fails: ensure AWS credentials are available (check `aws sts get-caller-identity`) and that your IAM principal has `ssm:PutParameter` rights for the parameter path.
    - Lambda middleware not applying changes: confirm that `withChaos` used the same SSM parameter path and that caching TTL is appropriate; consider redeploying or forcing a cold start for immediate effect.
    - Proxy not starting or image not pulling: ensure instance has ECR pull rights and Docker is installed; check SSM Run Command logs.
    - Unexpected high blast radius: immediately set SSM `enabled` to `false` and stop any running container agents.

    ---

    ## Extending the module (ideas)

    - Add a small admin API (protected) that toggles SSM param for quick enabled/disable during tests.
    - Implement more failure modes: HTTP latency distribution (random/exponential), response body corruption, 429 throttling simulation, or socket-level interruptions.
    - Add metric-backed safety gates: automated rollback if error rate or latency exceeds thresholds.
    - Add unit/integration tests for the middleware behaviors (simulate config and assert outcomes).

    ---

    ## Final notes

    This chaos module is intentionally minimal and designed for iterative use in staging environments. It trades advanced network-failure capabilities for a safer, smaller surface area focused on the most common resilience vectors: increased latency and probabilistic errors. Run small, measure well, keep rollback simple.

    If you'd like, I can also:
    - Produce a 1-page printable runbook that contains only the commands and a 5-step checklist.
    - Draft 3 low-risk, pre-baked hypotheses with exact SSM values and the CloudWatch queries you should watch during the test.

    ---

    Document created: `chaos-engineering/CHAOS_MODULE.md`
