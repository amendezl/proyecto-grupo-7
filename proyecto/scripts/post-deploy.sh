#!/bin/bash
# Post-deployment script for Linux/macOS
# Handles frontend build, deployment, and database seeding

set -e  # Exit on any error

STAGE=${1:-dev}
REGION=${2:-us-east-1}
SERVICE_NAME="sistema-gestion-espacios"
STACK_NAME="${SERVICE_NAME}-${STAGE}"

echo "==> Starting post-deployment tasks for ${STACK_NAME}..."

# Get API URLs from CloudFormation stack
echo "==> Getting API endpoints..."
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='HttpApiUrl'].OutputValue" \
  --output text 2>/dev/null || echo "")

WS_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='WebSocketApiUrl'].OutputValue" \
  --output text 2>/dev/null || echo "")

if [ -z "$API_URL" ]; then
  echo "Warning: Could not retrieve API_URL from stack outputs"
  API_URL="https://api-placeholder.execute-api.${REGION}.amazonaws.com"
fi

if [ -z "$WS_URL" ]; then
  echo "Warning: Could not retrieve WS_URL from stack outputs"
  WS_URL="wss://ws-placeholder.execute-api.${REGION}.amazonaws.com/${STAGE}"
fi

echo "API_URL: $API_URL"
echo "WS_URL: $WS_URL"

# Check if frontend directory exists
if [ ! -d "../frontend" ]; then
  echo "Warning: Frontend directory not found, skipping frontend deployment"
else
  echo "==> Preparing frontend environment..."
  
  # Navigate to frontend directory
  cd ../frontend
  
  # Install dependencies
  echo "==> Installing frontend dependencies..."
  npm ci
  
  # Create environment file
  echo "==> Creating environment configuration..."
  cat > .env.production.local << EOF
NEXT_PUBLIC_API_URL=${API_URL}
NEXT_PUBLIC_WS_URL=${WS_URL}
NEXT_PUBLIC_STAGE=${STAGE}
NEXT_PUBLIC_AWS_REGION=${REGION}
EOF
  
  # Build and export frontend
  echo "==> Building frontend..."
  npm run build
  
  echo "==> Exporting frontend..."
  npm run export
  
  # Return to serverless directory
  cd ../proyecto
  
  # Deploy frontend to S3
  echo "==> Uploading frontend to S3..."
  npx serverless client deploy --stage "$STAGE" --region "$REGION"
fi

# Seed database
echo "==> Seeding database..."
if [ -f "scripts/seed-dynamodb.js" ]; then
  DYNAMODB_TABLE="${SERVICE_NAME}-${STAGE}-main" node scripts/seed-dynamodb.js --stage "$STAGE" --yes
else
  echo "Warning: Database seeding script not found"
fi

# Run chaos engineering smoke tests
echo "==> Running chaos engineering smoke tests..."
if [ -d "../chaos-engineering" ]; then
  cd ../chaos-engineering
  npm ci
  npm run smoke
  cd ../proyecto
else
  echo "Warning: Chaos engineering directory not found, skipping smoke tests"
fi

echo "==> Post-deployment tasks completed successfully!"