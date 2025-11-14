# Deployment Scripts

This directory contains cross-platform scripts for handling both pre-deployment and post-deployment tasks for the Serverless Framework deployment.

## Files

### Pre-Deployment Scripts
- **`pre-deploy.sh`** - Linux/macOS bash script for infrastructure setup
- **`pre-deploy.ps1`** - Windows PowerShell script for infrastructure setup  
- **`run-pre-deploy.js`** - Cross-platform Node.js runner for pre-deployment tasks

### Post-Deployment Scripts
- **`post-deploy.sh`** - Linux/macOS bash script for frontend deployment and seeding
- **`post-deploy.ps1`** - Windows PowerShell script for frontend deployment and seeding  
- **`run-post-deploy.js`** - Cross-platform Node.js runner for post-deployment tasks

## What the scripts do

### Pre-Deployment Scripts
1. **Infrastructure Setup**
   - Deploy base AWS infrastructure via CloudFormation
   - Validate AWS credentials and configuration
   - Check existing stack status
   - Set up required environment variables

2. **Prerequisites Validation**
   - Check Node.js installation
   - Validate AWS CLI availability
   - Ensure infrastructure scripts are accessible

### Post-Deployment Scripts
1. **Frontend Deployment**
   - Install frontend dependencies
   - Retrieve API endpoints from CloudFormation stack
   - Generate environment configuration
   - Build and export the frontend
   - Upload to S3 via serverless-finch

2. **Database Seeding**
   - Run the DynamoDB seeding script with sample data

3. **Chaos Engineering**
   - Install chaos engineering dependencies
   - Run smoke tests to validate deployment

## Usage

### Automatic (via serverless hooks)
Both pre-deployment and post-deployment scripts run automatically during `serverless deploy` via the scriptable plugin.

### Manual execution

#### Using npm scripts (recommended)

**Pre-deployment scripts:**
```bash
# Run for current platform (auto-detects Windows vs Linux/macOS)
npm run pre-deploy

# Run for specific environments
npm run pre-deploy:dev
npm run pre-deploy:staging  
npm run pre-deploy:prod

# Platform-specific (manual)
npm run pre-deploy:win       # Windows PowerShell
npm run pre-deploy:unix      # Linux/macOS bash
```

**Post-deployment scripts:**
```bash
# Run for current platform (auto-detects Windows vs Linux/macOS)
npm run post-deploy

# Run for specific environments
npm run post-deploy:dev
npm run post-deploy:staging  
npm run post-deploy:prod

# Platform-specific (manual)
npm run post-deploy:win      # Windows PowerShell
npm run post-deploy:unix     # Linux/macOS bash
```

#### Direct execution

**Pre-deployment - Windows PowerShell:**
```powershell
.\scripts\pre-deploy.ps1 -Stage dev -Region us-east-1
```

**Pre-deployment - Linux/macOS:**
```bash
chmod +x scripts/pre-deploy.sh
./scripts/pre-deploy.sh dev us-east-1
```

**Pre-deployment - Cross-platform Node.js:**
```bash
node scripts/run-pre-deploy.js dev us-east-1
```

**Post-deployment - Windows PowerShell:**
```powershell
.\scripts\post-deploy.ps1 -Stage dev -Region us-east-1
```

**Post-deployment - Linux/macOS:**
```bash
chmod +x scripts/post-deploy.sh
./scripts/post-deploy.sh dev us-east-1
```

**Post-deployment - Cross-platform Node.js:**
```bash
node scripts/run-post-deploy.js dev us-east-1
```

## Parameters

Both scripts accept the same parameters:

1. **Stage** (default: `dev`) - The deployment stage (dev, staging, prod)
2. **Region** (default: `us-east-1`) - AWS region

## Error Handling

The scripts include comprehensive error handling:

- **Graceful degradation**: If a step fails, the script continues with warnings
- **Dependency checks**: Verifies required directories and files exist
- **AWS API validation**: Handles cases where CloudFormation outputs are not available
- **Cross-platform compatibility**: Works on Windows, macOS, and Linux

## Prerequisites

### All platforms:
- Node.js and npm installed
- AWS CLI configured with appropriate credentials
- Serverless Framework installed

### Windows additional:
- PowerShell (usually pre-installed)
- Execution policy allows script execution

### Linux/macOS additional:
- Bash shell (usually pre-installed)
- Execute permissions on scripts

## Troubleshooting

### Windows Issues
```powershell
# If you get execution policy errors:
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser

# Or run directly:
powershell -ExecutionPolicy Bypass -File scripts\post-deploy.ps1
```

### Linux/macOS Issues
```bash
# If permission denied:
chmod +x scripts/post-deploy.sh

# If bash not found:
/bin/bash scripts/post-deploy.sh dev us-east-1
```

### General Issues
- Ensure AWS credentials are properly configured
- Verify that the CloudFormation stack deployed successfully
- Check that all required directories exist (../frontend, ../chaos-engineering)
- Make sure npm dependencies are installed in the proyecto directory

## Environment Variables

The scripts respect these environment variables:

- `AWS_REGION` - Default AWS region
- `AWS_PROFILE` - AWS credential profile to use
- `NODE_ENV` - Node.js environment (affects frontend build)

## Integration with CI/CD

These scripts are designed to work in CI/CD environments:

```yaml
# GitHub Actions example
- name: Deploy and run post-deployment tasks
  run: |
    npm run deploy:dev
    npm run post-deploy:dev
```

For CI/CD environments, the scripts include additional safeguards and logging to help with debugging deployment issues.