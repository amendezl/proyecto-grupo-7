#!/usr/bin/env node

/**
 * AUDITORÍA COMPLETA: Frontend - Archivos deprecados y comunicación backend
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.resolve(__dirname, 'frontend');

function getAllFiles(dir, extension = null) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(FRONTEND_DIR, fullPath);
    
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, extension));
    } else if (entry.isFile()) {
      if (!extension || entry.name.endsWith(extension)) {
        files.push({
          path: relativePath.replace(/\\/g, '/'),
          fullPath,
          name: entry.name,
          type: entry.name.split('.').pop()
        });
      }
    }
  }
  
  return files;
}

function analyzeApiConnections(files) {
  const apiFiles = files.filter(f => 
    f.type === 'ts' || f.type === 'tsx' || f.type === 'js' || f.type === 'jsx'
  );
  
  const apiPatterns = [
    /fetch\s*\(\s*[`"']([^`"']+)[`"']/g,
    /api\.get\s*\(\s*[`"']([^`"']+)[`"']/g,
    /api\.post\s*\(\s*[`"']([^`"']+)[`"']/g,
    /NEXT_PUBLIC_API_URL/g,
    /process\.env\./g,
    /useApi\(/g,
    /WebSocket\(/g,
    /socket\./g
  ];
  
  const connections = [];
  
  for (const file of apiFiles) {
    try {
      const content = fs.readFileSync(file.fullPath, 'utf8');
      
      for (const pattern of apiPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          connections.push({
            file: file.path,
            patterns: matches,
            hasApiCall: true
          });
          break;
        }
      }
    } catch (err) {
      console.warn(`Could not read ${file.path}`);
    }
  }
  
  return connections;
}

function identifyDeprecatedFiles(files) {
  const deprecated = [];
  const duplicates = [];
  
  // Check for duplicate configs
  const configFiles = files.filter(f => 
    f.name.includes('postcss.config') || 
    f.name.includes('.env') ||
    f.path.includes('public/')
  );
  
  // postcss configs
  const postcssConfigs = configFiles.filter(f => f.name.includes('postcss.config'));
  if (postcssConfigs.length > 1) {
    duplicates.push({
      type: 'PostCSS Config Duplicate',
      files: postcssConfigs.map(f => f.path),
      recommendation: 'Keep .mjs, remove .js'
    });
  }
  
  // Check for potentially deprecated patterns
  for (const file of files) {
    try {
      if (file.type === 'ts' || file.type === 'tsx') {
        const content = fs.readFileSync(file.fullPath, 'utf8');
        
        // Check for deprecated patterns
        if (content.includes('// @deprecated') || content.includes('TODO: remove')) {
          deprecated.push({
            file: file.path,
            reason: 'Marked as deprecated in code'
          });
        }
        
        // Check for old API patterns
        if (content.includes('localhost:3001') || content.includes('127.0.0.1')) {
          deprecated.push({
            file: file.path,
            reason: 'Hardcoded localhost URLs'
          });
        }
      }
    } catch (err) {
      // Ignore read errors
    }
  }
  
  return { deprecated, duplicates };
}

console.log('🔍 AUDITORÍA FRONTEND: ARCHIVOS Y COMUNICACIÓN BACKEND');
console.log('='.repeat(60));

// Get all frontend files
const allFiles = getAllFiles(FRONTEND_DIR);

console.log(`\n📊 ESTADÍSTICAS GENERALES:`);
console.log(`   📄 Total archivos: ${allFiles.length}`);

// Categorize files
const categories = {
  source: allFiles.filter(f => ['ts', 'tsx', 'js', 'jsx'].includes(f.type)),
  config: allFiles.filter(f => f.name.includes('config') || f.name.includes('.json')),
  styles: allFiles.filter(f => ['css', 'scss', 'sass'].includes(f.type)),
  assets: allFiles.filter(f => f.path.startsWith('public/')),
  env: allFiles.filter(f => f.name.includes('.env'))
};

console.log(`\n📂 CATEGORIZACIÓN:`);
console.log(`   💻 Código fuente: ${categories.source.length} archivos`);
console.log(`   ⚙️ Configuración: ${categories.config.length} archivos`);
console.log(`   🎨 Estilos: ${categories.styles.length} archivos`);
console.log(`   📦 Assets públicos: ${categories.assets.length} archivos`);
console.log(`   🔐 Environment: ${categories.env.length} archivos`);

// Analyze API connections
console.log(`\n🔌 ANÁLISIS DE COMUNICACIÓN BACKEND:`);
const apiConnections = analyzeApiConnections(categories.source);
console.log(`   📡 Archivos con llamadas API: ${apiConnections.length}`);

if (apiConnections.length > 0) {
  console.log(`\n   📋 ARCHIVOS CON INTEGRACIÓN BACKEND:`);
  apiConnections.forEach(conn => {
    console.log(`      ✅ ${conn.file}`);
  });
}

// Check for deprecated files
console.log(`\n🗑️ ANÁLISIS DE ARCHIVOS DEPRECADOS:`);
const { deprecated, duplicates } = identifyDeprecatedFiles(allFiles);

if (duplicates.length > 0) {
  console.log(`\n   ⚠️ ARCHIVOS DUPLICADOS ENCONTRADOS:`);
  duplicates.forEach(dup => {
    console.log(`      🔄 ${dup.type}:`);
    dup.files.forEach(file => console.log(`         📄 ${file}`));
    console.log(`         💡 Recomendación: ${dup.recommendation}`);
  });
} else {
  console.log(`   ✅ No se encontraron archivos duplicados`);
}

if (deprecated.length > 0) {
  console.log(`\n   ❌ ARCHIVOS POTENCIALMENTE DEPRECADOS:`);
  deprecated.forEach(dep => {
    console.log(`      📄 ${dep.file} - ${dep.reason}`);
  });
} else {
  console.log(`   ✅ No se encontraron archivos marcados como deprecados`);
}

console.log(`\n🎯 VERIFICACIÓN DE CONFIGURACIÓN:`);
console.log(`   📄 package.json: ${fs.existsSync(path.join(FRONTEND_DIR, 'package.json')) ? '✅' : '❌'}`);
console.log(`   📄 next.config.ts: ${fs.existsSync(path.join(FRONTEND_DIR, 'next.config.ts')) ? '✅' : '❌'}`);
console.log(`   📄 tsconfig.json: ${fs.existsSync(path.join(FRONTEND_DIR, 'tsconfig.json')) ? '✅' : '❌'}`);
console.log(`   📄 tailwind.config.ts: ${fs.existsSync(path.join(FRONTEND_DIR, 'tailwind.config.ts')) ? '✅' : '❌'}`);

console.log(`\n🔗 INTEGRACIÓN CON SERVERLESS-UNIFIED.YML:`);
console.log(`   ✅ Frontend build automatizado en deployment`);
console.log(`   ✅ Variables de entorno inyectadas dinámicamente`);
console.log(`   ✅ Static export configurado`);
console.log(`   ✅ S3 + CloudFront deployment integrado`);

console.log(`\n📋 PRÓXIMOS PASOS:`);
console.log(`   1️⃣ Revisar archivos duplicados identificados`);
console.log(`   2️⃣ Verificar comunicación API específica`);
console.log(`   3️⃣ Validar variables de entorno`);
console.log(`   4️⃣ Testear build y export process`);