# aws-node-sls-starter

Starter kit mínimo para **AWS Lambda + API Gateway HTTP + SQS** con **Node.js 20** y **Serverless Framework v3**.

## Requisitos
- Node.js 18+ (ideal 20)
- Cuenta AWS con credenciales configuradas localmente (`aws configure`) y permisos para CFN/Lambda/API GW/SQS
- `npm i` para instalar dependencias

## Despliegue rápido (us-east-1 / dev)
```bash
npm run deploy
# o:
npx serverless deploy --stage dev --region us-east-1
```

Obtén las URLs:
```bash
npm run info
```

## Probar la API
```bash
# GET
curl "$(npx serverless info --verbose | grep HttpApiUrl | awk '{print $2}')/hello"

# POST
curl -X POST "$(npx serverless info --verbose | grep HttpApiUrl | awk '{print $2}')/enqueue"   -H 'content-type: application/json'   -d '{"id":"demo-1","value":123}'
```

Ver logs del worker:
```bash
npm run logs:worker
```

## Desarrollo local
```bash
npm run dev
# GET http://localhost:3000/hello
# POST http://localhost:3000/enqueue
```
> Nota: El *offline* sólo cubre HTTP. Para SQS local, usa LocalStack (abajo) y el plugin `serverless-offline-sqs` (ya incluido como devDependency). En `serverless.yml` descomenta el plugin y la sección `custom.serverless-offline-sqs`.

## LocalStack (opcional)
Inicia LocalStack con Docker y expone SQS en `:4566`:

```bash
docker compose up -d localstack
# Crear la cola en LocalStack (si autoCreate no la crea)
awslocal sqs create-queue --queue-name aws-node-sls-starter-dev-queue
# Arranca offline y el consumer SQS
npm run dev
```

## GitHub Actions (CI/CD)
Incluye `.github/workflows/deploy.yml` para desplegar a **prod** al hacer push a `main`.
Configura estos **Secrets** en tu repositorio:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (por ejemplo, `us-east-1`)

## Estructura
```
aws-node-sls-starter/
├─ serverless.yml
├─ package.json
├─ src/
│  └─ handlers/
│     ├─ hello.js
│     ├─ enqueue.js
│     └─ queueWorker.js
├─ .github/workflows/deploy.yml
├─ docker-compose.yml (opcional LocalStack)
└─ README.md
```

## Limpieza
```bash
npm run remove
```
