# DevOps Implementation Guide

This guide explains how each asset inside the `devops/` directory supports the unified serverless deployment of **Sistema de Gestión de Espacios**.

## Directory Overview

- `app/` – Express-based monitoring service that performs health checks over the Serverless backend, WebSocket API, DynamoDB tables, SQS queues, and the Next.js frontend.
- `automation/` – Node.js orchestrators for deployment (`deployment/full-stack-deploy.js`) and automated QA (`testing/comprehensive-test-suite.js`).
- `ci-cd/` – Plantillas de GitHub Actions y definiciones de pipeline reutilizables.
- `infra/` – Terraform configuration provisioning the supporting DevOps infrastructure: ECR repository, ECS cluster, CodeBuild project, CloudWatch log groups, and supporting IAM roles/policies.
- `monitoring/` – CloudWatch dashboard definition plus scripts to configure alarms over the deployed stack.
- `pipeline/` – AWS CodeBuild/CodeDeploy definitions used by the unified pipeline triggered from Serverless or CodePipeline.
- `scripts/` – Shell utilities for smoke, health, integration, and final validation stages executed locally or by deployment hooks.

## Prerequisites

- Node.js 22+
- AWS CLI configured with sufficient permissions (ECR, ECS, CloudWatch, DynamoDB, SQS, Lambda, CloudFormation)
- Terraform >= 1.0 when provisioning infrastructure
- Bash-compatible shell for automation scripts

## Provisioning Infrastructure

```bash
cd devops/infra
cp terraform.tfvars.example terraform.tfvars
# update environment, region, and naming as required
terraform init
terraform apply
```

Outputs include ECR repository URL, ECS cluster name, CodeBuild project, and CloudWatch log groups that are consumed by the build pipeline.

## Running the Full-stack Deployment

```bash
node devops/automation/deployment/full-stack-deploy.js --stage prod --region us-east-1
```

Steps executed:
1. `pre-deploy-checks.sh` validates credentials, network, and environment variables.
2. Serverless deploy for the backend via `proyecto` package scripts.
3. Static export of the Next.js frontend.
4. Smoke, integration, and final validation scripts run sequentially.

## Quality Gates

Execute the QA suite locally before submitting a PR:

```bash
node devops/automation/testing/comprehensive-test-suite.js
```

This runs monitor linting/tests and the smoke, health, and integration shell scripts.

## Continuous Integration

- `.github/workflows/cloud-deployment.yml` ejecuta linting del frontend y despliegue unificado de Serverless cuando se actualizan las ramas `main` o `production`, o bajo demanda vía `workflow_dispatch`.
- `.github/workflows/deploy-frontend.yml` construye y publica el frontend en Vercel cada vez que hay cambios en `frontend/**` (o manualmente).
- `.github/workflows/chaos-deploy.yml` crea y publica la imagen del módulo de chaos engineering en ECR y ejecuta el contenedor en instancias EC2 vía SSM.
- Las plantillas históricas se mantienen en `devops/ci-cd/github-actions/` como referencia (no se ejecutan automáticamente).

## Monitoring & Alerting

1. Deploy the monitoring dashboard:
   ```bash
    aws cloudwatch put-dashboard \
       --dashboard-name "sistema-gestion-espacios" \
       --dashboard-body file://devops/monitoring/cloudwatch/dashboard-sistema-gestion.json
   ```
2. Configure alarms (requires AWS credentials):
   ```bash
   node devops/monitoring/cloudwatch/setup-alerts.js --stage prod --region us-east-1
   ```

The monitoring service (`devops/app/server.js`) consumes `API_BASE_URL`, `FRONTEND_URL`, and `DEVOPS_STATUS_URL`—these are injected automatically by CodeBuild using Parameter Store and the rendered task definition (`pipeline/taskdef.json`).

## Pipeline Artifacts

`devops/pipeline/buildspec.yml` builds the monitor Docker image, exports the frontend, packages the Serverless backend, and normalizes the ECS task definition with runtime configuration values. The rendered artifacts (`serverless-package.zip`, `frontend-build.zip`, `taskdef.json`, `appspec.yaml`) feed CodePipeline/CodeDeploy or can be consumed manually.

## Validation Scripts

- `smoke.sh` – Quick availability checks for monitor, backend, and frontend.
- `health-check.sh` – Waits for monitor readiness and validates core endpoints.
- `integration-tests.sh` – Exercises domain endpoints (`/espacios`, `/reservas`, `/usuarios`, `/responsables`, `/zonas`) ensuring authentication guards respond correctly.
- `final-validation.sh` – Extended verification executed after traffic shifting.

## Clean-up

To remove deployed resources via Serverless:

```bash
npm run remove --prefix proyecto
```

To destroy DevOps infrastructure:

```bash
cd devops/infra
terraform destroy
```

---

By following this guide every artifact within `devops/` becomes an active component of the end-to-end deployment, validation, and monitoring workflow for the unified serverless architecture.
