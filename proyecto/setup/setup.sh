#!/bin/bash

# Project Setup Script
# Run this script before deploying the serverless application

echo "Setting up Box Management System Alpha..."

# Check if running on Linux with snap support
if command -v snap &> /dev/null; then
    echo "Installing AWS CLI via snap..."
    sudo snap install aws-cli --classic
    
    # Verify installation
    if aws --version &> /dev/null; then
        echo "AWS CLI installed successfully!!! Yay!!"
        aws --version
    else
        echo "AWS CLI installation failed"
        exit 1
    fi
else
    echo "Snap not available. Please install AWS CLI manually:"
    echo "   - Windows: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    echo "   - macOS: brew install awscli"
    echo "   - Linux (other): https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo " Node.js is not installed. Please install Node.js 22+ first."
    exit 1
fi
# Check Node.js version
NODE_VERSION=$(node -v | grep -oP 'v\K(\d+)')
if (( NODE_VERSION < 22 )); then
    echo " Node.js version is less than 22. Please upgrade Node.js to version 22 or higher."
    exit 1
fi

echo " Node.js version: $(node --version)"

# Install dependencies
echo "Installing npm dependencies..."
npm install

# Check if AWS credentials are configured
echo "Checking for AWS credentials..."
if aws sts get-caller-identity &> /dev/null; then
    echo "AWS credentials are configured"
    
    # Get AWS Account ID and set as environment variable
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo "AWS Account: $AWS_ACCOUNT_ID"
    echo "AWS Region: $(aws configure get region)"
    
    # Set AWS_ACCOUNT_ID environment variable for current session
    export AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID
    echo " AWS_ACCOUNT_ID environment variable set: $AWS_ACCOUNT_ID"
    
    # Add to .bashrc for persistent sessions (optional)
    if [[ "$SHELL" == *"bash"* ]] && [[ -f ~/.bashrc ]]; then
        if ! grep -q "export AWS_ACCOUNT_ID=" ~/.bashrc; then
            echo "# AWS Account ID for Box Management System" >> ~/.bashrc
            echo "export AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID" >> ~/.bashrc
            echo "  Added AWS_ACCOUNT_ID to ~/.bashrc for future sessions"
        else
            echo "  AWS_ACCOUNT_ID already exists in ~/.bashrc"
        fi
    fi
    
    # Add to .zshrc for zsh users (optional)
    if [[ "$SHELL" == *"zsh"* ]] && [[ -f ~/.zshrc ]]; then
        if ! grep -q "export AWS_ACCOUNT_ID=" ~/.zshrc; then
            echo "# AWS Account ID for Box Management System" >> ~/.zshrc
            echo "export AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID" >> ~/.zshrc
            echo "  Added AWS_ACCOUNT_ID to ~/.zshrc for future sessions"
        else
            echo "  AWS_ACCOUNT_ID already exists in ~/.zshrc"
        fi
    fi
    
else
    echo "AWS credentials not configured. Run 'aws configure' before deployment."
    echo "Cannot set AWS_ACCOUNT_ID without valid AWS credentials."
fi

# Check if serverless framework is available
if ! command -v serverless &> /dev/null && ! command -v npx &> /dev/null; then
    echo "Serverless Framework not found. Installing globally..."
    npm install -g serverless
else
    echo "Serverless Framework is available"
fi

SERVERLESS_VERSION=$(serverless --version 2>/dev/null || npx serverless --version 2>/dev/null)
if (SERVERLESS_VERSION < 4); then
    echo "Warning: Serverless Framework version is less than 4. Some features may not work as expected."
else
    echo "Serverless Framework version: $SERVERLESS_VERSION"
fi

echo ""
echo "---!! Setup complete! You can now deploy with:"
echo "   npm run deploy"
echo "   or"
echo "   npx serverless deploy --stage dev --region us-east-1"
echo ""
echo "Notes:"
echo "   AWS_ACCOUNT_ID environment variable is set for this session"
echo "   AWS_ACCOUNT_ID added to shell profile for future sessions"
echo "   If deployment fails, make sure AWS credentials have proper permissions"
echo ""
echo "To reload environment variables in current shell:"
echo "   source ~/.bashrc  # for bash users"
echo "   source ~/.zshrc   # for zsh users"