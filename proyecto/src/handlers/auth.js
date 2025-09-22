const DynamoDBManager = require('../database/DynamoDBManager');
const { parseBody, generateToken, hashPassword, verifyPassword, withErrorHandling } = require('../utils/auth');
const { success, badRequest, unauthorized, created } = require('../utils/responses');

const db = new DynamoDBManager();

const login = withErrorHandling(async (event) => {
    const { email, password } = parseBody(event);
    
    if (!email || !password) {
        return badRequest('Email y contraseña son requeridos');
    }
    
    const user = await db.getUsuarioByEmail(email);
    if (!user) {
        return unauthorized('Credenciales inválidas');
    }
    
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
        return unauthorized('Credenciales inválidas');
    }
    
    if (!user.activo) {
        return unauthorized('Usuario inactivo');
    }
    
    const token = generateToken({
        id: user.id,
        email: user.email,
        rol: user.rol,
        nombre: user.nombre,
        apellido: user.apellido
    });
    
    const { password: _, ...userWithoutPassword } = user;
    
    return success({
        token,
        user: userWithoutPassword
    });
});

const logout = withErrorHandling(async (event) => {
    return success({ message: 'Logout exitoso' });
});

const register = withErrorHandling(async (event) => {
    const userData = parseBody(event);
    
    const { nombre, apellido, email, password, rol, telefono, cargo, departamento } = userData;
    
    if (!nombre || !apellido || !email || !password) {
        return badRequest('Nombre, apellido, email y contraseña son requeridos');
    }
    
    const existingUser = await db.getUsuarioByEmail(email);
    if (existingUser) {
        return badRequest('El usuario ya existe con ese email');
    }
    
    const hashedPassword = await hashPassword(password);
    
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
    
    const { password: _, ...userWithoutPassword } = newUser;
    
    return created(userWithoutPassword);
});

module.exports = {
    login,
    logout,
    register
};
