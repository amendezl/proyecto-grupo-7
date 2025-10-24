#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Mapping of old paths to new paths
const pathMappings = {
  // Business API
  'src/handlers/usuarios': 'src/api/business/usuarios',
  'src/handlers/espacios': 'src/api/business/espacios',  
  'src/handlers/reservas': 'src/api/business/reservas',
  'src/handlers/responsables': 'src/api/business/responsables',
  'src/handlers/zonas': 'src/api/business/zonas',
  
  // Auth API
  'src/handlers/auth': 'src/api/auth/auth',
  'src/handlers/cognitoAuth': 'src/api/auth/cognitoAuth',
  
  // Integration API
  'src/handlers/websocket': 'src/api/integrations/websocket',
  'src/handlers/mobile': 'src/api/integrations/mobile',
  'src/handlers/sns': 'src/api/integrations/sns',
  'src/handlers/personalization': 'src/api/integrations/personalization',
  'src/handlers/personalizationForwarder': 'src/api/integrations/personalizationForwarder',
  
  // System API
  'src/handlers/healthCheck': 'src/api/system/healthCheck',
  'src/handlers/dashboard': 'src/api/system/dashboard',
  'src/handlers/dynamoStreamProcessor': 'src/api/system/dynamoStreamProcessor',
  'src/handlers/queueWorker': 'src/api/system/queueWorker',
  'src/handlers/horizontal': 'src/api/system/horizontal',
  'src/handlers/vertical': 'src/api/system/vertical'
};

// Read serverless.yml
const serverlessPath = 'serverless.yml';
let serverlessContent = fs.readFileSync(serverlessPath, 'utf8');

console.log('🔄 Updating serverless.yml handler paths...');

// Update all handler paths
Object.entries(pathMappings).forEach(([oldPath, newPath]) => {
  const regex = new RegExp(`handler:\\s*${oldPath.replace('/', '\\/')}`, 'g');
  const matches = serverlessContent.match(regex);
  if (matches) {
    console.log(`  📝 Updating ${matches.length} references: ${oldPath} → ${newPath}`);
    serverlessContent = serverlessContent.replace(regex, `handler: ${newPath}`);
  }
});

// Write updated serverless.yml
fs.writeFileSync(serverlessPath, serverlessContent);

console.log('✅ serverless.yml updated successfully!');

// Also update test files and other references
const filesToCheck = [
  'test-validation.js',
  'update-logs.js', 
  'validate-secure-logs.js'
];

filesToCheck.forEach(filename => {
  if (fs.existsSync(filename)) {
    console.log(`🔄 Checking ${filename} for import references...`);
    let content = fs.readFileSync(filename, 'utf8');
    let updated = false;
    
    // Check for require statements that need updating
    if (content.includes('src/handlers/') || content.includes('src/utils/') || content.includes('src/database/')) {
      console.log(`  📝 ${filename} needs manual review for import updates`);
    }
  }
});

console.log('🎯 Path migration completed! Remember to:');
console.log('  1. Test the deployment to ensure all handlers are found');
console.log('  2. Update any test files that import handlers directly');
console.log('  3. Verify that all require() statements in moved files are correct');