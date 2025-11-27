#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Setting up Sistema de Gestión de Espacios..."

if command -v aws >/dev/null 2>&1; then
    echo "AWS CLI detected: $(aws --version 2>&1)"
elif command -v snap >/dev/null 2>&1; then
    echo "AWS CLI not found. Installing via snap..."
    sudo snap install aws-cli --classic
    echo "AWS CLI installed: $(aws --version 2>&1)"
else
    echo "AWS CLI not found. Please install it manually:"
    echo "  - Windows: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    echo "  - macOS: brew install awscli"
    echo "  - Linux: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
fi

if ! command -v node >/dev/null 2>&1; then
    echo "Node.js not found. Install Node.js 22 or newer from https://nodejs.org/"
    exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
if [[ "$NODE_MAJOR" -lt 22 ]]; then
    echo "Detected Node.js $(node --version). Please upgrade to Node.js 22 or newer."
    exit 1
fi

echo "Node.js version: $(node --version)"

echo "Installing npm dependencies..."
if ! npm install; then
    echo "npm install failed. Resolve the errors above and rerun this script."
    exit 1
fi

if command -v aws >/dev/null 2>&1; then
    echo "Checking AWS credentials..."
    if aws sts get-caller-identity >/dev/null 2>&1; then
        AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        AWS_REGION=$(aws configure get region 2>/dev/null || echo "(not configured)")
        export AWS_ACCOUNT_ID
        echo "AWS credentials detected."
        echo "  Account: $AWS_ACCOUNT_ID"
        echo "  Region : $AWS_REGION"

        if [[ "$SHELL" == *"bash"* ]] && [[ -f ~/.bashrc ]]; then
            if ! grep -q "export AWS_ACCOUNT_ID=" ~/.bashrc; then
                {
                    echo "# AWS Account ID for Sistema de Gestión de Espacios"
                    echo "export AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID"
                } >> ~/.bashrc
                echo "  Added AWS_ACCOUNT_ID to ~/.bashrc"
            fi
        fi

        if [[ "$SHELL" == *"zsh"* ]] && [[ -f ~/.zshrc ]]; then
            if ! grep -q "export AWS_ACCOUNT_ID=" ~/.zshrc; then
                {
                    echo "# AWS Account ID for Sistema de Gestión de Espacios"
                    echo "export AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID"
                } >> ~/.zshrc
                echo "  Added AWS_ACCOUNT_ID to ~/.zshrc"
            fi
        fi
    else
        echo "AWS credentials not configured. Run 'aws configure' before deploying."
    fi
else
    echo "Skipping AWS credential check (aws CLI not available)."
fi

SERVERLESS_CMD=()
if command -v serverless >/dev/null 2>&1; then
    SERVERLESS_CMD=(serverless)
elif command -v npx >/dev/null 2>&1; then
    SERVERLESS_CMD=(npx serverless)
else
    echo "Serverless CLI and npx not found. Installing Serverless CLI globally..."
    if npm install -g serverless; then
        SERVERLESS_CMD=(serverless)
    else
        echo "Global installation failed. Install Serverless manually or ensure npm provides npx."
        SERVERLESS_CMD=(serverless)
    fi
fi

SERVERLESS_VERSION_RAW=$("${SERVERLESS_CMD[@]}" --version 2>/dev/null | head -n 1 || echo "")
SERVERLESS_MAJOR=$(echo "$SERVERLESS_VERSION_RAW" | grep -oE '[0-9]+' | head -n 1 || echo "0")

if [[ "$SERVERLESS_MAJOR" -lt 4 ]]; then
    echo "Warning: expected Serverless Framework v4+, detected: $SERVERLESS_VERSION_RAW"
else
    echo "Serverless Framework: $SERVERLESS_VERSION_RAW"
fi

echo
echo "Setup complete. You can deploy with:"
echo "  npm run deploy"
echo "or"
echo "  npx serverless deploy --stage dev --region us-east-1"
echo
echo "If you added AWS_ACCOUNT_ID to your shell profile, reload it with:"
echo "  source ~/.bashrc  # bash"
echo "  source ~/.zshrc   # zsh"