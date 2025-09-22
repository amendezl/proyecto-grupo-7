const fs = require('fs');
const path = require('path');

function checkFile(filePath, description) {
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${description}: ${filePath}`);
        return true;
    } else {
        console.log(`❌ ${description}: ${filePath} - NO ENCONTRADO`);
        return false;
    }
}

function checkAWSCredentials() {
    const { execSync } = require('child_process');
    try {
        const result = execSync('aws sts get-caller-identity', { encoding: 'utf8', stdio: 'pipe' });
        const identity = JSON.parse(result);
        console.log(`✅ AWS Credentials configuradas - Account: ${identity.Account}, User: ${identity.Arn.split('/').pop()}`);
        return true;
    } catch (error) {
        console.log('❌ AWS Credentials no configuradas o inválidas');
        console.log('   Ejecuta: aws configure');
        return false;
    }
}

function checkServerlessInstalled() {
    const { execSync } = require('child_process');
    try {
        const version = execSync('serverless --version', { encoding: 'utf8', stdio: 'pipe' });
        console.log(`✅ Serverless Framework instalado: ${version.trim()}`);
        return true;
    } catch (error) {
        console.log('❌ Serverless Framework no instalado');
        console.log('   Ejecuta: npm install -g serverless');
        return false;
    }
}

function main() {
    console.log('🔍 Verificando pre-requisitos para despliegue...\n');

    let allChecksPass = true;

    allChecksPass = checkAWSCredentials() && allChecksPass;

    allChecksPass = checkServerlessInstalled() && allChecksPass;

    const requiredFiles = [
        ['serverless.yml', 'Configuración de Serverless'],
        ['package.json', 'Configuración de NPM'],
        ['src/handlers/espacios.js', 'Handler de Espacios'],
        ['src/handlers/responsables.js', 'Handler de Responsables'],
        ['src/handlers/responsables.js', 'Handler de Responsables'],
        ['src/handlers/zonas.js', 'Handler de Zonas'],
        ['src/handlers/cognitoAuth.js', 'Handler de Autenticación'],
        ['src/handlers/healthCheck.js', 'Handler de Health Check'],
        ['src/utils/resilienceManager.js', 'Manager de Resiliencia'],
        ['src/patterns/bulkheadPattern.js', 'Patrón Bulkhead'],
        ['src/patterns/retryPattern.js', 'Patrón Retry'],
        ['src/patterns/circuitBreakerPattern.js', 'Patrón Circuit Breaker']
    ];

    console.log('\n📁 Verificando archivos del proyecto:');
    requiredFiles.forEach(([file, description]) => {
        allChecksPass = checkFile(file, description) && allChecksPass;
    });

    console.log('\nVerificando dependencias:');
    if (fs.existsSync('node_modules')) {
        console.log('✅ Node modules instalados');
    } else {
        console.log('❌ Node modules no instalados');
        console.log('   Ejecuta: npm install');
        allChecksPass = false;
    }

    console.log('\nVerificando configuración:');
    const serverlessConfig = fs.readFileSync('serverless.yml', 'utf8');
    if (serverlessConfig.includes('sistema-gestion-espacios')) {
        console.log('✅ Service name actualizado a genérico');
    } else {
        console.log('❌ Service name no actualizado');
        allChecksPass = false;
    }

    console.log('\n' + '='.repeat(60));
    if (allChecksPass) {
        console.log('¡TODO LISTO PARA DESPLIEGUE!');
        console.log('\nEjecuta ahora:');
        console.log('   serverless deploy');
        console.log('\n   Este comando desplegará:');
        console.log('   ✅ 50 Lambda Functions');
        console.log('   ✅ DynamoDB Table');
        console.log('   ✅ Cognito User Pool');
        console.log('   ✅ SQS Queue');
        console.log('   ✅ API Gateway');
        console.log('   ✅ IAM Roles y Permisos');
        console.log('   ✅ Sistema de Gestión de Espacios Completo');
        process.exit(0);
    } else {
        console.log('❌ HAY PROBLEMAS QUE RESOLVER ANTES DEL DESPLIEGUE');
        console.log('\nResuelve los errores marcados arriba y vuelve a ejecutar este script');
        process.exit(1);
    }
}

main();
