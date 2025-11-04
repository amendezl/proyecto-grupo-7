#!/usr/bin/env node

// Full-stack deployment orchestrator for the Sistema de Gestión de Espacios
// Executes pre-deploy checks, serverless deployment, static export, and post-deploy validation.

const { spawnSync } = require('node:child_process');
const { resolve, join } = require('node:path');

const rootDir = resolve(__dirname, '../../..');
const proyectoDir = join(rootDir, 'proyecto');
const frontendDir = join(rootDir, 'frontend');
const scriptsDir = join(rootDir, 'devops', 'scripts');

const args = process.argv.slice(2);
const stageArgIndex = args.indexOf('--stage');
const regionArgIndex = args.indexOf('--region');

const stage = stageArgIndex >= 0 ? args[stageArgIndex + 1] : process.env.STAGE || 'dev';
const region = regionArgIndex >= 0 ? args[regionArgIndex + 1] : process.env.REGION || 'us-east-1';

function runStep(step, command, commandArgs, options = {}) {
  console.log(`\n▶ ${step}`);
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    env: {
      ...process.env,
      STAGE: stage,
      REGION: region
    },
    ...options
  });

  if (result.status !== 0) {
    throw new Error(`${step} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function main() {
  console.log('🚀 Iniciando deployment unificado del Sistema de Gestión de Espacios');
  console.log(`   Stage: ${stage}`);
  console.log(`   Region: ${region}`);

  runStep('Validaciones previas', 'bash', [join(scriptsDir, 'pre-deploy-checks.sh')]);

  runStep(
    'Despliegue backend Serverless',
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['serverless', 'deploy', '--stage', stage, '--region', region],
    { cwd: proyectoDir }
  );

  runStep('Exportación estática del frontend', 'npm', ['run', 'export'], { cwd: frontendDir });

  runStep('Smoke tests post-deploy', 'bash', [join(scriptsDir, 'smoke.sh')]);

  runStep('Integration tests', 'bash', [join(scriptsDir, 'integration-tests.sh')]);

  runStep('Validación final', 'bash', [join(scriptsDir, 'final-validation.sh')]);

  console.log('\n✅ Deployment full-stack completado con éxito');
}

try {
  main();
} catch (error) {
  console.error('\n❌ Deployment interrumpido:', error.message);
  process.exit(1);
}
