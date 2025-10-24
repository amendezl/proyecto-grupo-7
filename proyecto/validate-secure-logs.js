const fs = require('fs');
const path = require('path');

const UNSAFE_PATTERNS = [
  /console\.log.*password/i,
  /console\.log.*token/i,
  /console\.log.*jwt/i,
  /console\.log.*secret/i,
  /console\.log.*claims\./,
  /console\.log.*email/i,
  /console\.error.*password/i,
  /console\.error.*token/i,
  /console\.warn.*claims\./,
  /console\.log.*\{[^}]*email[^}]*\}/i,
  /console\.log.*\{[^}]*password[^}]*\}/i,
  /console\.log.*\{[^}]*token[^}]*\}/i
];

const POTENTIAL_ISSUES = [
  /console\.log\([^)]*\{[^}]{50,}\}/,  // Objetos grandes
  /console\.log.*event\./,             // Logging del event completo
  /console\.log.*context\./,           // Logging del context completo
  /console\.log.*claims/i,             // Cualquier referencia a claims
];

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const issues = [];
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      UNSAFE_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          issues.push({
            type: 'UNSAFE',
            line: lineNum,
            content: line.trim(),
            file: filePath
          });
        }
      });
      
      POTENTIAL_ISSUES.forEach(pattern => {
        if (pattern.test(line)) {
          issues.push({
            type: 'POTENTIAL',
            line: lineNum,
            content: line.trim(),
            file: filePath
          });
        }
      });
    });
    
    return issues;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

function validateDirectory(dirPath) {
  const allIssues = [];
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        allIssues.push(...validateDirectory(fullPath));
      } else if (stat.isFile() && fullPath.endsWith('.js')) {
        const issues = checkFile(fullPath);
        allIssues.push(...issues);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error.message);
  }
  
  return allIssues;
}

console.log('🔍 Validating secure logging implementation...\n');

const srcPath = path.join(__dirname, 'src');
const issues = validateDirectory(srcPath);

if (issues.length === 0) {
  console.log('✅ No security issues found in logging!');
  console.log('✅ All logs appear to use secure structured logging.');
} else {
  console.log(`⚠️  Found ${issues.length} potential logging security issues:\n`);
  
  const unsafeIssues = issues.filter(i => i.type === 'UNSAFE');
  const potentialIssues = issues.filter(i => i.type === 'POTENTIAL');
  
  if (unsafeIssues.length > 0) {
    console.log('🚨 CRITICAL - Unsafe logging patterns:');
    unsafeIssues.forEach(issue => {
      console.log(`   ${issue.file}:${issue.line}`);
      console.log(`   ${issue.content}\n`);
    });
  }
  
  if (potentialIssues.length > 0) {
    console.log('⚠️  REVIEW - Potentially unsafe patterns:');
    potentialIssues.forEach(issue => {
      console.log(`   ${issue.file}:${issue.line}`);
      console.log(`   ${issue.content}\n`);
    });
  }
}

const handlersDir = path.join(__dirname, 'src', 'handlers');
const handlerFiles = fs.readdirSync(handlersDir).filter(f => f.endsWith('.js'));

let missingLogger = 0;
handlerFiles.forEach(file => {
  const filePath = path.join(handlersDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  const hasConsole = /console\.(log|error|warn|info)/g.test(content);
  const hasLogger = content.includes("require('../../infrastructure/monitoring/logger')") || content.includes("require('../monitoring/logger')");
  
  if (hasConsole && !hasLogger) {
    console.log(`⚠️  ${file} uses console.* but doesn't import logger`);
    missingLogger++;
  }
});

if (missingLogger === 0) {
  console.log('✅ All handlers using console.* have logger imported.');
} else {
  console.log(`⚠️  ${missingLogger} handlers need logger import.`);
}

console.log('\n📊 Validation Summary:');
console.log(`   Unsafe patterns: ${issues.filter(i => i.type === 'UNSAFE').length}`);
console.log(`   Potential issues: ${issues.filter(i => i.type === 'POTENTIAL').length}`);
console.log(`   Missing logger imports: ${missingLogger}`);

process.exit(issues.filter(i => i.type === 'UNSAFE').length > 0 ? 1 : 0);