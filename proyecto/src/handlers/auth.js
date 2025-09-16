const DynamoDBManager = require('../database/DynamoDBManager');
const { parseBody, generateToken, hashPassword, verifyPassword, withErrorHandling } = require('../utils/auth');
const { success, badRequest, unauthorized, created } = require('../utils/responses');

const db = new DynamoDBManager();

/**
 * Login de usuario
 */
const login = withErrorHandling(async (event) => {
    const { email, password } = parseBody(event);
    
    if (!email || !password) {
        return badRequest('Email y contraseña son requeridos');
    }
    
    // Buscar usuario por email
    const user = await db.getUsuarioByEmail(email);
    if (!user) {
        return unauthorized('Credenciales inválidas');
    }
    
    // Verificar contraseña
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
        return unauthorized('Credenciales inválidas');
    }
    
    // Verificar si el usuario está activo
    if (!user.activo) {
        return unauthorized('Usuario inactivo');
    }
    
    // Generar token
    const token = generateToken({
        id: user.id,
        email: user.email,
        rol: user.rol,
        nombre: user.nombre,
        apellido: user.apellido
    });
    
    // Retornar respuesta sin contraseña
    const { password: _, ...userWithoutPassword } = user;
    
    return success({
        token,
        user: userWithoutPassword
    });
});

/**
 * Logout de usuario (en este caso solo confirmamos que el token es válido)
 */
const logout = withErrorHandling(async (event) => {
    // En un sistema serverless, el logout es simplemente eliminar el token del cliente
    // Aquí podríamos implementar una blacklist de tokens si fuera necesario
    return success({ message: 'Logout exitoso' });
});

/**
 * Registro de nuevo usuario (solo para administradores)
 */
const register = withErrorHandling(async (event) => {
    const userData = parseBody(event);
    
    const { nombre, apellido, email, password, rol, telefono, cargo, departamento } = userData;
    
    if (!nombre || !apellido || !email || !password) {
        return badRequest('Nombre, apellido, email y contraseña son requeridos');
    }
    
    // Verificar si el usuario ya existe
    const existingUser = await db.getUsuarioByEmail(email);
    if (existingUser) {
        return badRequest('El usuario ya existe con ese email');
    }
    
    // Hash de la contraseña
    const hashedPassword = await hashPassword(password);
    
    // Crear usuario
    const newUser = await db.createUsuario({
        nombre,
        apellido,
        email,
        password: hashedPassword,
        rol: rol || 'usuario',
        telefono,
        cargo,
        departamento,
        activo: true
    });
    
    // Retornar usuario sin contraseña
    const { password: _, ...userWithoutPassword } = newUser;
    
    return created(userWithoutPassword);
});

module.exports = {
    login,
    logout,
    register
};
