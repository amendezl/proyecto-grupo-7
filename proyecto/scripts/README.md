Seed scripts for DynamoDB test data

Usage:

1. Ensure AWS credentials are configured in your environment (AWS_PROFILE or env vars).
2. Ensure the DynamoDB table exists and note its name (e.g. `sistema-gestion-espacios-dev-table`).
3. Run from project root:

PowerShell example:

```powershell
$env:DYNAMODB_TABLE='sistema-gestion-espacios-dev-table'
$env:AWS_REGION='us-east-1'
npm run seed
```

Or directly:

```powershell
$env:DYNAMODB_TABLE='sistema-gestion-espacios-dev-table'
node .\scripts\seed-dynamodb.js
```

The seeder will insert a mix of users, spaces, zones, responsables and reservas (roughly 100+ items). It uses `@aws-sdk/lib-dynamodb` PutCommand.
