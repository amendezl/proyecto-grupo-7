const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDeleteUserCommand,
  ListUsersCommand,
  AdminAddUserToGroupCommand,
  AdminCreateGroupCommand
} = require('@aws-sdk/client-cognito-identity-provider');

const { logger } = require('../monitoring/logger');

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const USER_POOL_ID = process.env.USER_POOL_ID;

async function createUser(email, password, role = 'usuario', nombre = '', apellido = '') {
  if (!USER_POOL_ID) {
    logger.error('USER_POOL_ID no está configurado');
    process.exit(1);
  }

  try {
    logger.info('Creating new user', {
      userRole: role || 'unknown'
    });
    
    const createCmd = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: nombre },
        { Name: 'family_name', Value: apellido },
        { Name: 'custom:role', Value: role }
      ],
      MessageAction: 'SUPPRESS'
    });

    await client.send(createCmd);
    logger.info(' Usuario creado exitosamente');

    const passwordCmd = new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: true
    });

    await client.send(passwordCmd);

    logger.info('User password set successfully', {
      userEmail: email,
      userRole: role
    });

    logger.info('User created successfully', {
      userEmail: email,
      userRole: role,
      userName: `${nombre} ${apellido}`,
      passwordSet: true
    });

  } catch (error) {
    logger.error('User creation failed', {
      errorMessage: error.message,
      errorType: error.constructor.name,
      userRole: role || 'unknown'
    });
  }
}

async function listUsers() {
  if (!USER_POOL_ID) {
    logger.error('USER_POOL_ID no está configurado');
    process.exit(1);
  }

  try {
    const cmd = new ListUsersCommand({
      UserPoolId: USER_POOL_ID
    });

    const result = await client.send(cmd);
    
    console.log(`\n👥 Usuarios en el pool (${result.Users.length}):\n`);
    
    result.Users.forEach((user, index) => {
      const email = user.Attributes.find(attr => attr.Name === 'email')?.Value || 'N/A';
      const role = user.Attributes.find(attr => attr.Name === 'custom:role')?.Value || 'usuario';
      const name = user.Attributes.find(attr => attr.Name === 'name')?.Value || '';
      const familyName = user.Attributes.find(attr => attr.Name === 'family_name')?.Value || '';
      
      logger.info('User found in pool', {
        userIndex: index + 1,
        userRole: role,
        hasEmail: !!email,
        hasName: !!name,
        hasFamilyName: !!familyName
      });
      console.log(`   Estado: ${user.UserStatus}`);
      console.log(`   Creado: ${user.UserCreateDate}`);
      console.log('');
    });

  } catch (error) {
    logger.error('❌ Error listando usuarios:', { errorMessage: error.message.message, errorType: error.message.constructor.name });
  }
}

async function deleteUser(email) {
  if (!USER_POOL_ID) {
    logger.error('USER_POOL_ID no está configurado');
    process.exit(1);
  }

  try {
    const cmd = new AdminDeleteUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email
    });

    await client.send(cmd);
    logger.info(' Usuario ${email} eliminado exitosamente');

  } catch (error) {
    logger.error('❌ Error eliminando usuario:', { errorMessage: error.message.message, errorType: error.message.constructor.name });
  }
}

function showHelp() {
  console.log(`
Script de gestión de usuarios de Cognito

Uso: node src/utils/cognito-users.js [comando] [argumentos]

Comandos disponibles:
  create <email> <password> [rol] [nombre] [apellido]
    Crea un nuevo usuario en Cognito
    Ejemplo: node src/utils/cognito-users.js create admin@empresa.com Admin123! admin "Dr. Juan" "Pérez"

  list
    Lista todos los usuarios del pool
    Ejemplo: node src/utils/cognito-users.js list

  delete <email>
    Elimina un usuario del pool
    Ejemplo: node src/utils/cognito-users.js delete usuario@empresa.com

  help
    Muestra esta ayuda

Variables de entorno requeridas:
  USER_POOL_ID: ID del User Pool de Cognito
  AWS_REGION: Región de AWS (default: us-east-1)

Roles disponibles:
  - admin: Administrador del sistema
  - responsable: Responsable de espacios
  - usuario: Usuario final (default)

Ejemplos de usuarios para pruebas:
  node src/utils/cognito-users.js create admin@empresa.com Admin123! admin "Dr. Juan" "Pérez"
  node src/utils/cognito-users.js create responsable@empresa.com Resp123! responsable "María" "González"
  node src/utils/cognito-users.js create usuario@empresa.com User123! usuario "Carlos" "Martínez"
`);
}

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'create':
    if (args.length < 3) {
      logger.error('❌ Faltan argumentos. Uso: create <email> <password> [rol] [nombre] [apellido]');
      process.exit(1);
    }
    createUser(args[1], args[2], args[3] || 'usuario', args[4] || '', args[5] || '');
    break;

  case 'list':
    listUsers();
    break;

  case 'delete':
    if (args.length < 2) {
      logger.error('❌ Falta email. Uso: delete <email>');
      process.exit(1);
    }
    deleteUser(args[1]);
    break;

  case 'help':
  default:
    showHelp();
    break;
}
