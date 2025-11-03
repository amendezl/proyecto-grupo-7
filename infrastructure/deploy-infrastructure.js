#!/usr/bin/env node

/**
 * Script para desplegar la infraestructura AWS CloudFormation
 * Uso: node deploy-infrastructure.js [environment]
 * donde [environment] puede ser 'dev', 'staging' o 'prod'
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Obtener el entorno de los argumentos
const environment = process.argv[2] || 'dev';
if (!['dev', 'staging', 'prod'].includes(environment)) {
  console.error('Error: El entorno debe ser "dev", "staging" o "prod"');
  process.exit(1);
}

// Nombre del stack
const stackName = `gestion-espacios-${environment}`;

// Ruta del template CloudFormation
const templatePath = path.resolve(__dirname, 'cloudformation-template.yml');

// Verificar que el template exista
if (!fs.existsSync(templatePath)) {
  console.error('Error: No se encontró el archivo de template CloudFormation');
  process.exit(1);
}

console.log(`🚀 Desplegando infraestructura para entorno: ${environment}`);
console.log('📋 Validando template CloudFormation...');

try {
  // Validar el template CloudFormation
  execSync(`aws cloudformation validate-template --template-body file://${templatePath}`, {
    stdio: 'inherit'
  });

  console.log('✅ Template validado correctamente');
  console.log(`🔨 Desplegando stack "${stackName}"...`);

  // Desplegar el stack CloudFormation
  execSync(
    `aws cloudformation deploy \
    --template-file ${templatePath} \
    --stack-name ${stackName} \
    --parameter-overrides Environment=${environment} \
    --capabilities CAPABILITY_NAMED_IAM \
    --tags Project=GestionEspacios Environment=${environment}`,
    { stdio: 'inherit' }
  );

  console.log('📊 Obteniendo información del stack desplegado...');

  // Mostrar los outputs del stack
  const outputs = JSON.parse(
    execSync(
      `aws cloudformation describe-stacks \
      --stack-name ${stackName} \
      --query "Stacks[0].Outputs" \
      --output json`
    ).toString()
  );

  console.log('\n🎉 ¡Despliegue completado con éxito!\n');
  console.log('📋 Recursos desplegados:');
  
  outputs.forEach(output => {
    console.log(`- ${output.OutputKey}: ${output.OutputValue}`);
  });

  // Crear un archivo con los outputs para referencia futura
  const outputsFile = path.resolve(__dirname, `outputs-${environment}.json`);
  fs.writeFileSync(outputsFile, JSON.stringify(outputs, null, 2));
  console.log(`\n💾 Outputs guardados en: ${outputsFile}`);

  console.log('\n🔗 Pasos siguientes:');
  console.log('1. Configurar los secrets de GitHub Actions con las claves AWS');
  console.log('2. Actualizar serverless.yml con los recursos creados');
  console.log('3. Ejecutar el pipeline de GitHub Actions');

} catch (error) {
  console.error('❌ Error durante el despliegue:', error.message);
  process.exit(1);
}