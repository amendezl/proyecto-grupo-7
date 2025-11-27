#!/bin/bash

# Pre-deployment script for Linux/macOS - Sistema Gestión de Espacios
# This script handles pre-deployment tasks including infrastructure setup
# before the main serverless deployment process.

set -e  # Exit on any error

# Default values
STAGE="${1:-dev}"
REGION="${2:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "${CYAN}$1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if directory exists
directory_exists() {
    [ -d "$1" ]
}

# Main execution starts here
log_header "====================================================="
log_header "   PRE-DEPLOYMENT SCRIPT - LINUX/MACOS BASH"
log_header "====================================================="
log_info "Stage: $STAGE"
log_info "Region: $REGION"
log_info "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
log_header "====================================================="

# Validate prerequisites
log_header "\n🔍 Validating prerequisites..."

prerequisite_errors=()

# Check Node.js
if ! command_exists node; then
    prerequisite_errors+=("Node.js is not installed or not in PATH")
else
    node_version=$(node --version 2>/dev/null || echo "unknown")
    log_success "Node.js: $node_version"
fi

# Check AWS CLI
if ! command_exists aws; then
    prerequisite_errors+=("AWS CLI is not installed or not in PATH")
else
    aws_version=$(aws --version 2>/dev/null || echo "unknown")
    log_success "AWS CLI: $aws_version"
fi

# Check if infrastructure directory exists
infrastructure_dir="../infrastructure"
if ! directory_exists "$infrastructure_dir"; then
    prerequisite_errors+=("Infrastructure directory not found: $infrastructure_dir")
else
    log_success "Infrastructure directory found"
fi

# Check if deploy-infrastructure.js exists
deploy_script="$infrastructure_dir/deploy-infrastructure.js"
if [ ! -f "$deploy_script" ]; then
    prerequisite_errors+=("Deploy script not found: $deploy_script")
else
    log_success "Deploy script found: $deploy_script"
fi

if [ ${#prerequisite_errors[@]} -gt 0 ]; then
    log_error "Prerequisites validation failed:"
    for error in "${prerequisite_errors[@]}"; do
        echo -e "${RED}   - $error${NC}"
    done
    log_warning "Continuing with warnings. Some steps may fail."
fi

# Step 1: Deploy base infrastructure
log_header "\n🚀 Step 1: Deploying base infrastructure..."

if directory_exists "$infrastructure_dir" && [ -f "$deploy_script" ]; then
    (
        cd "$infrastructure_dir" || exit 1
        log_info "Executing: node deploy-infrastructure.js $STAGE"
        
        if node deploy-infrastructure.js "$STAGE"; then
            log_success "Infrastructure deployment completed successfully"
        else
            log_warning "Infrastructure deployment completed with warnings"
        fi
    )
else
    log_warning "Infrastructure deployment skipped (missing files or directory)"
fi

# Step 2: Validate AWS credentials and region
log_header "\n🔐 Step 2: Validating AWS configuration..."

# Test AWS credentials
if command_exists aws; then
    if identity=$(aws sts get-caller-identity --output json 2>/dev/null); then
        arn=$(echo "$identity" | grep -o '"Arn": "[^"]*' | cut -d'"' -f4)
        account=$(echo "$identity" | grep -o '"Account": "[^"]*' | cut -d'"' -f4)
        log_success "AWS Identity: $arn"
        log_info "   Account: $account"
    else
        log_warning "Could not retrieve AWS identity"
    fi
    
    # Validate region
    current_region=$(aws configure get region 2>/dev/null || echo "")
    if [ "$current_region" != "$REGION" ] && [ -n "$current_region" ]; then
        log_warning "AWS CLI region ($current_region) differs from target region ($REGION)"
        log_info "   Using target region: $REGION"
    else
        log_success "AWS region validated: $REGION"
    fi
else
    log_warning "AWS CLI not available for validation"
fi

# Step 3: Check CloudFormation stack status (optional)
log_header "\n📋 Step 3: Checking existing infrastructure..."

stack_name="sistema-gestion-infraestructura-$STAGE"

if command_exists aws; then
    if stack_status=$(aws cloudformation describe-stacks --stack-name "$stack_name" --region "$REGION" --query 'Stacks[0].StackStatus' --output text 2>/dev/null); then
        log_success "Infrastructure stack status: $stack_status"
        
        if echo "$stack_status" | grep -q "ROLLBACK\|FAILED"; then
            log_warning "Stack is in a failed state. Consider cleanup before deployment."
        fi
    else
        log_info "Infrastructure stack not found (will be created during deployment)"
    fi
else
    log_info "Cannot check infrastructure stack status (AWS CLI not available)"
fi

# Step 4: Environment setup summary
log_header "\n📊 Step 4: Environment summary..."

log_info "Environment Variables:"
log_info "  - AWS_REGION: $REGION"
log_info "  - STAGE: $STAGE"

# Export environment variables for the deployment process
export AWS_REGION="$REGION"
export STAGE="$STAGE"

log_success "\n✅ Pre-deployment setup completed!"
log_header "====================================================="

# Final validation
if [ ${#prerequisite_errors[@]} -eq 0 ]; then
    log_success "🎉 All checks passed. Ready for serverless deployment!"
    exit 0
else
    log_warning "⚠️  Pre-deployment completed with ${#prerequisite_errors[@]} warning(s)"
    log_warning "   Serverless deployment will proceed but may encounter issues"
    exit 0  # Don't fail the deployment, just warn
fi