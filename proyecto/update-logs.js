const fs = require('fs');
const path = require('path');

const handlersDir = path.join(__dirname, 'src', 'handlers');
const utilsDir = path.join(__dirname, 'src', 'utils');

function updateLogsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    const hasLoggerImport = content.includes("require('../monitoring/logger')") || content.includes("require('../../infrastructure/monitoring/logger')");
    
    if (!hasLoggerImport && (content.includes('console.log') || content.includes('console.error') || content.includes('console.warn'))) {
      const isInHandlers = filePath.includes('/handlers/');
      const loggerPath = isInHandlers ? "../utils/logger" : "./logger";
      
      if (content.includes('require(')) {
        const lastRequire = content.lastIndexOf('require(');
        const nextLineAfterRequire = content.indexOf('\n', lastRequire);
        
        if (nextLineAfterRequire !== -1) {
          const beforeImport = content.substring(0, nextLineAfterRequire);
          const afterImport = content.substring(nextLineAfterRequire);
          content = beforeImport + `\n// FIXED: Import secure logger for structured logging\nconst { logger } = require('${loggerPath}');` + afterImport;
          modified = true;
        }
      }
    }
    
    const errorPattern = /console\.error\(['"`]([^'"`]+)['"`],?\s*([^)]*)\);/g;
    content = content.replace(errorPattern, (match, message, errorVar) => {
      if (errorVar.trim()) {
        modified = true;
        return `logger.error('${message}', { errorMessage: ${errorVar.trim()}.message, errorType: ${errorVar.trim()}.constructor.name });`;
      } else {
        modified = true;
        return `logger.error('${message}');`;
      }
    });
    
    const infoPattern = /console\.log\(['"`]([^'"`]*(?:✅|📋|🔄|📢|📡)[^'"`]*)['"`]([^)]*)\);/g;
    content = content.replace(infoPattern, (match, message, context) => {
      modified = true;
      if (context.trim()) {
        return `logger.info('${message.replace(/[✅📋🔄📢📡]/g, '')}', ${context.trim()});`;
      } else {
        return `logger.info('${message.replace(/[✅📋🔄📢📡]/g, '')}');`;
      }
    });
    
    const warnPattern = /console\.warn\(['"`]([^'"`]+)['"`],?\s*([^)]*)\);/g;
    content = content.replace(warnPattern, (match, message, context) => {
      modified = true;
      if (context.trim()) {
        return `logger.warn('${message}', ${context.trim()});`;
      } else {
        return `logger.warn('${message}');`;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
    
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
  }
}

function processDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        processDirectory(fullPath);
      } else if (stat.isFile() && fullPath.endsWith('.js')) {
        updateLogsInFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error.message);
  }
}

console.log('Updating logs to secure structured format...');
processDirectory(handlersDir);
processDirectory(utilsDir);
console.log('Log update completed!');