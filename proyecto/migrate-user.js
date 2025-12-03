/**
 * Script para migrar usuario existente sin empresa_id a un nuevo usuario con empresa_id
 * 
 * Uso: node migrate-user.js <email> <nueva-password> <empresa_id> <empresa_nombre>
 * Ejemplo: node migrate-user.js benjobera@gmail.com MiPassword123! benjobera Benjobera
 */

const { CognitoIdentityProviderClient, AdminDeleteUserCommand, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminAddUserToGroupCommand, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
const userPoolId = 'us-east-1_tJ3a9pate';

async function migrateUser() {
    const args = process.argv.slice(2);
    
    if (args.length < 4) {
        console.error('❌ Uso: node migrate-user.js <email> <nueva-password> <empresa_id> <empresa_nombre>');
        console.error('❌ Ejemplo: node migrate-user.js benjobera@gmail.com MiPassword123! benjobera Benjobera');
        process.exit(1);
    }

    const [email, password, empresa_id, empresa_nombre] = args;

    console.log(`\n🔄 Migrando usuario: ${email}`);
    console.log(`   Empresa ID: ${empresa_id}`);
    console.log(`   Empresa Nombre: ${empresa_nombre}\n`);

    try {
        // 1. Obtener información del usuario actual
        console.log('📋 Obteniendo información del usuario actual...');
        const getUserCommand = new AdminGetUserCommand({
            UserPoolId: userPoolId,
            Username: email
        });
        
        const userInfo = await cognitoClient.send(getUserCommand);
        
        const nombre = userInfo.UserAttributes.find(attr => attr.Name === 'name')?.Value || email;
        const apellido = userInfo.UserAttributes.find(attr => attr.Name === 'family_name')?.Value || '';
        
        console.log(`   ✅ Usuario encontrado: ${nombre} ${apellido}`);

        // 2. Eliminar usuario actual
        console.log('\n🗑️  Eliminando usuario antiguo...');
        const deleteCommand = new AdminDeleteUserCommand({
            UserPoolId: userPoolId,
            Username: email
        });
        
        await cognitoClient.send(deleteCommand);
        console.log('   ✅ Usuario eliminado');

        // 3. Crear nuevo usuario con empresa_id
        console.log('\n➕ Creando nuevo usuario con empresa_id...');
        const createUserCommand = new AdminCreateUserCommand({
            UserPoolId: userPoolId,
            Username: email,
            UserAttributes: [
                { Name: 'email', Value: email },
                { Name: 'email_verified', Value: 'true' },
                { Name: 'name', Value: nombre },
                { Name: 'family_name', Value: apellido },
                { Name: 'custom:empresa_id', Value: empresa_id },
                { Name: 'custom:empresa_nombre', Value: empresa_nombre }
            ],
            MessageAction: 'SUPPRESS'
        });

        await cognitoClient.send(createUserCommand);
        console.log('   ✅ Usuario creado');

        // 4. Establecer password
        console.log('\n🔑 Estableciendo contraseña...');
        const setPasswordCommand = new AdminSetUserPasswordCommand({
            UserPoolId: userPoolId,
            Username: email,
            Password: password,
            Permanent: true
        });

        await cognitoClient.send(setPasswordCommand);
        console.log('   ✅ Contraseña establecida');

        // 5. Agregar a grupo admin
        console.log('\n👤 Agregando a grupo admin...');
        const addToGroupCommand = new AdminAddUserToGroupCommand({
            UserPoolId: userPoolId,
            Username: email,
            GroupName: 'admin'
        });

        await cognitoClient.send(addToGroupCommand);
        console.log('   ✅ Usuario agregado al grupo admin');

        console.log('\n✅ ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
        console.log('\n📝 Detalles del nuevo usuario:');
        console.log(`   Email: ${email}`);
        console.log(`   Nombre: ${nombre} ${apellido}`);
        console.log(`   Empresa ID: ${empresa_id}`);
        console.log(`   Empresa Nombre: ${empresa_nombre}`);
        console.log(`   Rol: admin`);
        console.log('\n🔐 Ahora puedes iniciar sesión con:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: (la que estableciste)`);

    } catch (error) {
        console.error('\n❌ Error durante la migración:', error.message);
        
        if (error.name === 'UserNotFoundException') {
            console.error('   El usuario no existe. Verifica el email.');
        } else if (error.name === 'InvalidPasswordException') {
            console.error('   La contraseña no cumple con los requisitos (mínimo 8 caracteres, mayúsculas, minúsculas, números).');
        } else if (error.name === 'UsernameExistsException') {
            console.error('   Ya existe un usuario con ese email. Puede que la eliminación haya fallado.');
        }
        
        process.exit(1);
    }
}

migrateUser();
