#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import mappings for the new structure  
const importMappings = {
  // Database
  '../database/': '../../infrastructure/database/',
  './database/': '../infrastructure/database/',
  
  // Utils (split into multiple locations)
  '../utils/logger': '../../infrastructure/monitoring/logger',
  './logger': '../monitoring/logger',
  '../utils/metrics': '../../infrastructure/monitoring/metrics',
  '../utils/snsNotifications': '../../infrastructure/messaging/snsNotifications',
  '../utils/auth': '../../core/auth/auth',
  '../utils/cognitoAuth': '../../core/auth/cognitoAuth', 
  '../utils/cognito-users': '../../core/auth/cognito-users',
  '../utils/permissions': '../../core/auth/permissions',
  '../utils/validator': '../../core/validation/validator',
  '../utils/responses': '../../shared/utils/responses',
  '../utils/resilienceManager': '../../shared/utils/resilienceManager',
  '../utils/personalizationManager': '../../shared/utils/personalizationManager',
  './resilienceManager': '../../shared/utils/resilienceManager',
  './metrics': '../monitoring/metrics',
  
  // Middleware  
  '../middleware/validation': '../../core/validation/middleware',
  
  // Patterns
  '../patterns/': '../patterns/'
};

function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    Object.entries(importMappings).forEach(([oldPath, newPath]) => {
      const oldRequire = `require('${oldPath}')`;
      const newRequire = `require('${newPath}')`;
      
      if (content.includes(oldRequire)) {
        content = content.replace(new RegExp(escapeRegExp(oldRequire), 'g'), newRequire);
        updated = true;
      }
    });
    
    if (updated) {
      fs.writeFileSync(filePath, content);
      console.log(`  ✅ Updated imports in ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(`  ❌ Error updating ${filePath}: ${error.message}`);
    return false;
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walkDirectory(dirPath, callback) {
  const items = fs.readdirSync(dirPath);
  
  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      walkDirectory(fullPath, callback);
    } else if (stat.isFile() && item.endsWith('.js')) {
      callback(fullPath);
    }
  });
}

console.log('🔄 Updating import paths in all JavaScript files...\n');

// Update files in the new src directory structure
const srcDir = path.join(process.cwd(), 'src');
if (fs.existsSync(srcDir)) {
  console.log('📁 Updating files in src directory...');
  walkDirectory(srcDir, updateImportsInFile);
}

// Update specific files in root
const rootFiles = ['test-validation.js', 'update-logs.js', 'validate-secure-logs.js'];
rootFiles.forEach(fileName => {
  if (fs.existsSync(fileName)) {
    console.log(`📄 Updating ${fileName}...`);
    updateImportsInFile(fileName);
  }
});

console.log('\n✅ Import path updates completed!');
console.log('\n🎯 Next steps:');
console.log('  1. Test the validation script: node test-validation.js');
console.log('  2. Check for any remaining import errors');
console.log('  3. Run a test deployment to verify all handlers work');