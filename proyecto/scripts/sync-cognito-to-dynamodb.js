/**
 * Script para sincronizar usuarios de Cognito a DynamoDB
 * Útil cuando tienes usuarios en Cognito pero no en DynamoDB
 */

const { CognitoIdentityProviderClient, ListUsersCommand } = require("@aws-sdk/client-cognito-identity-provider");
const DynamoDBManager = require('../src/infrastructure/database/DynamoDBManager');
const bcrypt = require('bcryptjs');

const USER_POOL_ID = process.env.USER_POOL_ID || 'us-east-1_aR6LB6m5r';
const EMPRESA_ID = process.env.EMPRESA_ID || 'empresa-default';

const cognitoClient = new CognitoIdentityProviderClient({});
const db = new DynamoDBManager();

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

async function syncUsers() {
  try {
    console.log('🔄 Sincronizando usuarios de Cognito a DynamoDB...\n');
    
    // Listar usuarios de Cognito
    const listCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID
    });
    
    const response = await cognitoClient.send(listCommand);
    const users = response.Users || [];
    
    console.log(`📋 Encontrados ${users.length} usuarios en Cognito\n`);
    
    let created = 0;
    let existing = 0;
    let errors = 0;
    
    for (const cognitoUser of users) {
      const email = cognitoUser.Attributes.find(attr => attr.Name === 'email')?.Value;
      const nombre = cognitoUser.Attributes.find(attr => attr.Name === 'name')?.Value || 'Usuario';
      const apellido = cognitoUser.Attributes.find(attr => attr.Name === 'family_name')?.Value || 'Cognito';
      const sub = cognitoUser.Attributes.find(attr => attr.Name === 'sub')?.Value;
      
      if (!email) {
        console.log(`⚠️  Usuario sin email, saltando: ${cognitoUser.Username}`);
        continue;
      }
      
      try {
        // Verificar si ya existe en DynamoDB
        const existingUser = await db.getUsuarioByEmail(email);
        
        if (existingUser) {
          console.log(`✅ Usuario ya existe en DynamoDB: ${email}`);
          
          // Si no tiene empresa_id, actualizarlo
          if (!existingUser.empresa_id || existingUser.empresa_id === '') {
            await db.updateEntity('usuario', existingUser.id, { 
              empresa_id: EMPRESA_ID 
            });
            console.log(`   📝 Actualizado empresa_id a: ${EMPRESA_ID}`);
          }
          
          existing++;
        } else {
          // Crear usuario en DynamoDB
          const hashedPassword = await hashPassword('ChangeMe123!'); // Password temporal
          
          const userData = {
            id: sub,
            email: email,
            nombre: nombre,
            apellido: apellido,
            password: hashedPassword,
            rol: 'admin', // Por defecto admin
            activo: true,
            empresa_id: EMPRESA_ID
          };
          
          // Solo agregar teléfono si está presente
          const phone = cognitoUser.Attributes.find(attr => attr.Name === 'phone_number')?.Value;
          if (phone) {
            userData.telefono = phone;
          }
          
          const newUser = await db.createUsuario(userData);
          
          console.log(`✨ Creado nuevo usuario en DynamoDB: ${email}`);
          console.log(`   📧 Email: ${email}`);
          console.log(`   👤 Nombre: ${nombre} ${apellido}`);
          console.log(`   🏢 Empresa ID: ${EMPRESA_ID}`);
          console.log(`   🔑 Password temporal: ChangeMe123! (cambiar en el siguiente login)`);
          created++;
        }
        
      } catch (error) {
        console.error(`❌ Error procesando ${email}:`, error.message);
        errors++;
      }
      
      console.log(''); // Línea en blanco
    }
    
    console.log('\n📊 Resumen:');
    console.log(`   ✨ Creados: ${created}`);
    console.log(`   ✅ Ya existían: ${existing}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`   📋 Total procesados: ${users.length}`);
    
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    process.exit(1);
  }
}

// Ejecutar
syncUsers()
  .then(() => {
    console.log('\n✅ Sincronización completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
