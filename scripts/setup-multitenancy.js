/**
 * Script para configurar multitenancy en el sistema
 * - Agrega el atributo custom:empresa_id a usuarios de Cognito
 * - Crea organizaciones/empresas de ejemplo
 */

const { 
  CognitoIdentityProviderClient, 
  AdminUpdateUserAttributesCommand,
  ListUsersCommand,
  AdminGetUserCommand 
} = require('@aws-sdk/client-cognito-identity-provider');
const { v4: uuidv4 } = require('uuid');

const USER_POOL_ID = process.env.USER_POOL_ID || 'us-east-1_aR6LB6m5r';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });

/**
 * Agrega empresa_id a un usuario de Cognito
 */
async function addEmpresaIdToUser(username, empresaId) {
  try {
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      UserAttributes: [
        {
          Name: 'custom:empresa_id',
          Value: empresaId
        }
      ]
    });

    await cognitoClient.send(command);
    console.log(`✅ Usuario ${username} ahora pertenece a empresa ${empresaId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error agregando empresa_id a usuario ${username}:`, error.message);
    return false;
  }
}

/**
 * Obtiene todos los usuarios del User Pool
 */
async function getAllUsers() {
  try {
    const command = new ListUsersCommand({
      UserPoolId: USER_POOL_ID
    });

    const response = await cognitoClient.send(command);
    return response.Users || [];
  } catch (error) {
    console.error('❌ Error obteniendo usuarios:', error.message);
    return [];
  }
}

/**
 * Verifica si un usuario ya tiene empresa_id
 */
function getUserEmpresaId(user) {
  const empresaIdAttr = user.Attributes?.find(attr => attr.Name === 'custom:empresa_id');
  return empresaIdAttr?.Value || null;
}

/**
 * Script principal
 */
async function main() {
  console.log('\n🚀 Iniciando configuración de multitenancy...\n');

  // Generar ID de empresa por defecto (puedes cambiarlo por uno específico)
  const defaultEmpresaId = process.argv[2] || uuidv4();
  
  console.log(`📦 Empresa ID por defecto: ${defaultEmpresaId}\n`);

  // Obtener todos los usuarios
  console.log('📋 Obteniendo usuarios de Cognito...');
  const users = await getAllUsers();
  
  if (users.length === 0) {
    console.log('⚠️  No se encontraron usuarios en el User Pool');
    return;
  }

  console.log(`✅ Encontrados ${users.length} usuarios\n`);

  // Procesar cada usuario
  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    const username = user.Username;
    const email = user.Attributes?.find(attr => attr.Name === 'email')?.Value || 'N/A';
    const existingEmpresaId = getUserEmpresaId(user);

    if (existingEmpresaId) {
      console.log(`⏭️  Usuario ${username} (${email}) ya tiene empresa_id: ${existingEmpresaId}`);
      skipped++;
    } else {
      console.log(`🔧 Configurando usuario ${username} (${email})...`);
      const success = await addEmpresaIdToUser(username, defaultEmpresaId);
      if (success) {
        updated++;
      }
    }
  }

  console.log('\n📊 Resumen:');
  console.log(`   ✅ Usuarios actualizados: ${updated}`);
  console.log(`   ⏭️  Usuarios omitidos: ${skipped}`);
  console.log(`   📦 Total procesados: ${users.length}\n`);

  console.log('✅ Configuración de multitenancy completada!\n');
  console.log('💡 Próximos pasos:');
  console.log('   1. Verifica que los usuarios tengan empresa_id en Cognito');
  console.log('   2. Crea espacios y zonas - se asociarán automáticamente a la empresa');
  console.log('   3. Solo usuarios de la misma empresa verán estos recursos\n');
}

// Ejecutar script
main().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
