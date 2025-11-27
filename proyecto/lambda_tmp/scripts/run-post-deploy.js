#!/usr/bin/env node
/**
 * Cross-platform post-deployment script runner
 * Detects the operating system and runs the appropriate script
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get command line arguments
const args = process.argv.slice(2);
const stage = args[0] || 'dev';
const region = args[1] || 'us-east-1';

console.log(`🚀 Running post-deployment tasks for stage: ${stage}, region: ${region}`);
console.log(`📍 Platform detected: ${process.platform}`);

// Determine which script to run based on platform
const isWindows = process.platform === 'win32';
const scriptName = isWindows ? 'post-deploy.ps1' : 'post-deploy.sh';
const scriptPath = path.join(__dirname, scriptName);

// Check if script exists
if (!fs.existsSync(scriptPath)) {
    console.error(`❌ Script not found: ${scriptPath}`);
    process.exit(1);
}

// Prepare command and arguments
let command, scriptArgs;

if (isWindows) {
    // Windows PowerShell
    command = 'powershell';
    scriptArgs = [
        '-ExecutionPolicy', 'Bypass',
        '-File', scriptPath,
        '-Stage', stage,
        '-Region', region
    ];
} else {
    // Unix/Linux/macOS Bash
    // Make sure the script is executable
    try {
        fs.chmodSync(scriptPath, '755');
    } catch (error) {
        console.warn(`⚠️  Could not make script executable: ${error.message}`);
    }
    
    command = scriptPath;
    scriptArgs = [stage, region];
}

console.log(`🔧 Executing: ${command} ${scriptArgs.join(' ')}`);

// Spawn the process
const child = spawn(command, scriptArgs, {
    stdio: 'inherit',
    shell: isWindows,
    cwd: process.cwd()
});

// Handle process completion
child.on('close', (code) => {
    if (code === 0) {
        console.log(`✅ Post-deployment tasks completed successfully!`);
    } else {
        console.error(`❌ Post-deployment tasks failed with exit code: ${code}`);
    }
    process.exit(code);
});

// Handle process errors
child.on('error', (error) => {
    console.error(`❌ Failed to start post-deployment script: ${error.message}`);
    
    // Provide helpful error messages
    if (isWindows && error.code === 'ENOENT') {
        console.error(`💡 Tip: Make sure PowerShell is installed and available in PATH`);
        console.error(`💡 Alternative: Run manually with: npm run post-deploy:win`);
    } else if (!isWindows && error.code === 'ENOENT') {
        console.error(`💡 Tip: Make sure bash is installed and available in PATH`);
        console.error(`💡 Alternative: Run manually with: npm run post-deploy:unix`);
    }
    
    process.exit(1);
});