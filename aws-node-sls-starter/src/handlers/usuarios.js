const DynamoDBManager = require('../database/DynamoDBManager');
const { resilienceManager } = require('../utils/resilienceManager');
const { withAuth, withErrorHandling, extractQueryParams, extractPathParams, parseBody, hashPassword } = require('../utils/auth');
const { success, badRequest, notFound, created, conflict } = require('../utils/responses');

const db = new DynamoDBManager();

/**
 * Obtener todos los usuarios (solo admins)
 * Incluye resiliencia para consultas de usuarios
 */
const getUsuarios = withAuth(async (event) => {
    const queryParams = extractQueryParams(event);
    
    try {
        const result = await resilienceManager.executeDatabase(
            async () => {
                const filters = {};
                if (queryParams.rol) filters.rol = queryParams.rol;
                if (queryParams.activo !== undefined) filters.activo = queryParams.activo === 'true';
                
                const usuarios = await db.getUsuarios(filters);
                
                // Remover contraseñas de la respuesta
                const usuariosSinPassword = usuarios.map(({ password, ...usuario }) => usuario);
                
                return {
                    usuarios: usuariosSinPassword,
                    total: usuariosSinPassword.length,
                    filtros_aplicados: Object.keys(filters).length > 0 ? filters : null
                };
            },
            {
                operation: 'getUsuarios',
                priority: 'standard',
                fallbackStrategy: 'CACHE_FALLBACK'
            }
        );
        
        return success(result);
        
    } catch (error) {
        // Fallback para consultas de usuarios
        if (error.name === 'CircuitOpenError' || error.name === 'RetryExhaustedError') {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: true,
                    data: {
                        usuarios: [],
                        total: 0,
                        warning: 'Datos de usuarios no disponibles temporalmente'
                    }
                })
            };
        }
        
        console.error('[GET_USUARIOS] Error:', error);
        throw error;
    }
}, ['admin']);

/**
 * Obtener un usuario por ID
 * Incluye resiliencia para consultas individuales
 */
const getUsuario = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    const user = event.user;
    
    if (!id) {
        return badRequest('ID del usuario es requerido');
    }
    
    // Los usuarios normales solo pueden ver su propio perfil
    if (user.rol === 'usuario' && user.id !== id) {
        return notFound('Usuario no encontrado');
    }
    
    try {
        const usuario = await resilienceManager.executeDatabase(
            async () => {
                const resultado = await db.getUsuarioById(id);
                if (!resultado) {
                    throw new Error('Usuario no encontrado');
                }
                
                // Remover contraseña de la respuesta
                const { password, ...usuarioSinPassword } = resultado;
                return usuarioSinPassword;
            },
            {
                operation: 'getUsuario',
                priority: 'standard',
                usuarioId: id,
                fallbackStrategy: 'CACHE_FALLBACK'
            }
        );
        
        return success(usuario);
        
    } catch (error) {
        if (error.message === 'Usuario no encontrado') {
            return notFound('Usuario no encontrado');
        }
        
        // Manejo de errores de resiliencia
        if (error.name === 'CircuitOpenError') {
            return {
                statusCode: 503,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: 'Sistema de usuarios temporalmente sobrecargado'
                })
            };
        }
        
        console.error('[GET_USUARIO] Error:', error);
        throw error;
    }
});

/**
 * Crear un nuevo usuario (solo admins)
 */
const createUsuario = withAuth(async (event) => {
    const userData = parseBody(event);
    
    const { nombre, apellido, email, password, rol, telefono, cargo, departamento, activo } = userData;
    
    if (!nombre || !apellido || !email || !password) {
        return badRequest('Nombre, apellido, email y contraseña son requeridos');
    }
    
    // Verificar si el usuario ya existe
    const existingUser = await db.getUsuarioByEmail(email);
    if (existingUser) {
        return conflict('Ya existe un usuario con ese email');
    }
    
    // Hash de la contraseña
    const hashedPassword = await hashPassword(password);
    
    const nuevoUsuario = await db.createUsuario({
        nombre,
        apellido,
        email,
        password: hashedPassword,
        rol: rol || 'usuario',
        telefono,
        cargo,
        departamento,
        activo: activo !== false
    });
    
    // Remover contraseña de la respuesta
    const { password: _, ...usuarioSinPassword } = nuevoUsuario;
    
    return created(usuarioSinPassword);
}, ['admin']);

/**
 * Actualizar un usuario existente
 */
const updateUsuario = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    const updateData = parseBody(event);
    const user = event.user;
    
    if (!id) {
        return badRequest('ID del usuario es requerido');
    }
    
    // Los usuarios normales solo pueden actualizar su propio perfil
    if (user.rol === 'usuario' && user.id !== id) {
        return notFound('Usuario no encontrado');
    }
    
    try {
        // Si es un usuario normal, limitar los campos que puede actualizar
        if (user.rol === 'usuario') {
            const allowedFields = ['nombre', 'apellido', 'telefono'];
            const filteredData = {};
            Object.keys(updateData).forEach(key => {
                if (allowedFields.includes(key)) {
                    filteredData[key] = updateData[key];
                }
            });
            updateData = filteredData;
        }
        
        // Si se está actualizando la contraseña, hashearla
        if (updateData.password) {
            updateData.password = await hashPassword(updateData.password);
        }
        
        const usuarioActualizado = await db.updateEntity('usuario', id, updateData);
        
        // Remover contraseña de la respuesta
        const { password, ...usuarioSinPassword } = usuarioActualizado;
        
        return success(usuarioSinPassword);
    } catch (error) {
        if (error.message === 'usuario no encontrado') {
            return notFound('Usuario no encontrado');
        }
        throw error;
    }
});

/**
 * Eliminar un usuario (solo admins)
 */
const deleteUsuario = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    
    if (!id) {
        return badRequest('ID del usuario es requerido');
    }
    
    try {
        await db.deleteEntity('usuario', id);
        return success({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        if (error.message === 'usuario no encontrado') {
            return notFound('Usuario no encontrado');
        }
        throw error;
    }
}, ['admin']);

/**
 * Cambiar estado de usuario (activar/desactivar) - solo admins
 */
const toggleUsuarioEstado = withAuth(async (event) => {
    const { id } = extractPathParams(event);
    const { activo } = parseBody(event);
    
    if (!id) {
        return badRequest('ID del usuario es requerido');
    }
    
    if (typeof activo !== 'boolean') {
        return badRequest('El estado activo debe ser true o false');
    }
    
    try {
        const usuarioActualizado = await db.updateEntity('usuario', id, { activo });
        
        // Remover contraseña de la respuesta
        const { password, ...usuarioSinPassword } = usuarioActualizado;
        
        return success(usuarioSinPassword);
    } catch (error) {
        if (error.message === 'usuario no encontrado') {
            return notFound('Usuario no encontrado');
        }
        throw error;
    }
}, ['admin']);

/**
 * Obtener perfil del usuario actual
 */
const getPerfilActual = withAuth(async (event) => {
    const user = event.user;
    
    const usuario = await db.getUsuarioById(user.id);
    
    if (!usuario) {
        return notFound('Usuario no encontrado');
    }
    
    // Remover contraseña de la respuesta
    const { password, ...usuarioSinPassword } = usuario;
    
    return success(usuarioSinPassword);
});

/**
 * Actualizar perfil del usuario actual
 */
const updatePerfilActual = withAuth(async (event) => {
    const user = event.user;
    const updateData = parseBody(event);
    
    // Limitar los campos que puede actualizar un usuario en su propio perfil
    const allowedFields = ['nombre', 'apellido', 'telefono'];
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
            filteredData[key] = updateData[key];
        }
    });
    
    try {
        const usuarioActualizado = await db.updateEntity('usuario', user.id, filteredData);
        
        // Remover contraseña de la respuesta
        const { password, ...usuarioSinPassword } = usuarioActualizado;
        
        return success(usuarioSinPassword);
    } catch (error) {
        if (error.message === 'usuario no encontrado') {
            return notFound('Usuario no encontrado');
        }
        throw error;
    }
});

/**
 * Cambiar contraseña del usuario actual
 */
const cambiarPassword = withAuth(async (event) => {
    const user = event.user;
    const { passwordActual, passwordNuevo } = parseBody(event);
    
    if (!passwordActual || !passwordNuevo) {
        return badRequest('Contraseña actual y nueva contraseña son requeridas');
    }
    
    if (passwordNuevo.length < 6) {
        return badRequest('La nueva contraseña debe tener al menos 6 caracteres');
    }
    
    try {
        const usuario = await db.getUsuarioById(user.id);
        if (!usuario) {
            return notFound('Usuario no encontrado');
        }
        
        // Verificar contraseña actual
        const bcrypt = require('bcryptjs');
        const isValidPassword = await bcrypt.compare(passwordActual, usuario.password);
        if (!isValidPassword) {
            return badRequest('La contraseña actual es incorrecta');
        }
        
        // Hash de la nueva contraseña
        const hashedPassword = await hashPassword(passwordNuevo);
        
        await db.updateEntity('usuario', user.id, { password: hashedPassword });
        
        return success({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        throw error;
    }
});

module.exports = {
    getUsuarios,
    getUsuario,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    toggleUsuarioEstado,
    getPerfilActual,
    updatePerfilActual,
    cambiarPassword
};
