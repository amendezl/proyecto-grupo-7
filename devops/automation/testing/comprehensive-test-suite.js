#!/usr/bin/env node

// Comprehensive QA suite executing unit, integration, and health validations for DevOps assets.

const { spawnSync } = require('node:child_process');
const { resolve, join } = require('node:path');

const rootDir = resolve(__dirname, '../../..');
const monitorDir = join(rootDir, 'devops', 'app');
const scriptsDir = join(rootDir, 'devops', 'scripts');

function run(step, command, args, options = {}) {
  console.log(`\n🧪 ${step}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env },
    ...options
  });

  if (result.status !== 0) {
    throw new Error(`${step} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function main() {
  console.log('🔍 Ejecutando suite completa de validaciones DevOps');

  run('Lint del monitor DevOps', 'npm', ['run', 'lint'], { cwd: monitorDir });
  run('Pruebas unitarias/integración del monitor', 'npm', ['test'], { cwd: monitorDir });

  run('Smoke tests', 'bash', [join(scriptsDir, 'smoke.sh')]);
  run('Health checks', 'bash', [join(scriptsDir, 'health-check.sh')]);
  run('Integration tests', 'bash', [join(scriptsDir, 'integration-tests.sh')]);

  console.log('\n✅ Todas las validaciones DevOps completadas satisfactoriamente');
}

try {
  main();
} catch (error) {
  console.error('\n❌ Falló la suite de validaciones:', error.message);
  process.exit(1);
}
