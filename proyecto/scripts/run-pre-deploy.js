#!/usr/bin/env node

/**
 * Cross-platform pre-deployment script runner
 * Automatically detects the operating system and executes the appropriate pre-deployment script
 * 
 * Usage:
 *   node run-pre-deploy.js [stage] [region]
 *   
 * Examples:
 *   node run-pre-deploy.js dev us-east-1
 *   node run-pre-deploy.js prod
 *   node run-pre-deploy.js
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

// Default values
const stage = process.argv[2] || 'dev';
const region = process.argv[3] || 'us-east-1';

// Platform detection
const platform = os.platform();
const isWindows = platform === 'win32';
const isLinux = platform === 'linux';
const isMacOS = platform === 'darwin';

console.log('🚀 Cross-Platform Pre-Deployment Script Runner');
console.log('===============================================');
console.log(`Platform: ${platform}`);
console.log(`Stage: ${stage}`);
console.log(`Region: ${region}`);
console.log('===============================================\n');

/**
 * Execute a command with proper error handling and output
 */
function executeCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        console.log(`📋 Executing: ${command} ${args.join(' ')}`);
        
        const child = spawn(command, args, {
            stdio: 'inherit',
            shell: isWindows,
            ...options
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ Command completed successfully`);
                resolve(code);
            } else {
                console.log(`⚠️  Command completed with exit code: ${code}`);
                // Don't reject, just resolve with the exit code
                // This allows the deployment to continue even if pre-deployment has warnings
                resolve(code);
            }
        });
        
        child.on('error', (error) => {
            console.error(`❌ Command failed: ${error.message}`);
            reject(error);
        });
    });
}

/**
 * Main execution function
 */
async function main() {
    try {
        let exitCode = 0;
        
        if (isWindows) {
            // Windows PowerShell execution
            console.log('🪟 Detected Windows - using PowerShell script');
            
            const scriptPath = path.join(__dirname, 'pre-deploy.ps1');
            const psArgs = [
                '-ExecutionPolicy', 'Bypass',
                '-File', scriptPath,
                '-Stage', stage,
                '-Region', region
            ];
            
            exitCode = await executeCommand('powershell', psArgs);
            
        } else if (isLinux || isMacOS) {
            // Linux/macOS Bash execution
            console.log(`🐧 Detected ${isMacOS ? 'macOS' : 'Linux'} - using Bash script`);
            
            const scriptPath = path.join(__dirname, 'pre-deploy.sh');
            
            // Make script executable first
            try {
                await executeCommand('chmod', ['+x', scriptPath]);
            } catch (error) {
                console.log('⚠️  Could not make script executable, trying anyway...');
            }
            
            exitCode = await executeCommand(scriptPath, [stage, region]);
            
        } else {
            // Unsupported platform fallback
            console.log(`⚠️  Unsupported platform: ${platform}`);
            console.log('🔄 Attempting to run infrastructure deployment directly...');
            
            // Try to run the infrastructure deployment directly
            const infraPath = path.resolve(__dirname, '..', '..', 'infrastructure', 'deploy-infrastructure.js');
            exitCode = await executeCommand('node', [infraPath, stage]);
        }
        
        // Summary
        console.log('\n===============================================');
        if (exitCode === 0) {
            console.log('🎉 Pre-deployment completed successfully!');
            console.log('   Ready to proceed with serverless deployment.');
        } else {
            console.log(`⚠️  Pre-deployment completed with warnings (exit code: ${exitCode})`);
            console.log('   Serverless deployment will proceed but may encounter issues.');
        }
        console.log('===============================================');
        
        // Always exit with 0 to not block the serverless deployment
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Pre-deployment script failed:');
        console.error(error.message);
        console.log('\n⚠️  Continuing with serverless deployment despite pre-deployment failure...');
        
        // Even on error, don't block the serverless deployment
        process.exit(0);
    }
}

// Handle process signals
process.on('SIGINT', () => {
    console.log('\n⚠️  Pre-deployment interrupted by user');
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.log('\n⚠️  Pre-deployment terminated');
    process.exit(1);
});

// Run the main function
main().catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(0); // Still don't block serverless deployment
});