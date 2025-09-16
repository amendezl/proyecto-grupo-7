# Sistema de Gestión de Espacios con AWS Cognito

Este sistema ha sido migrado para usar AWS Cognito como proveedor de autenticación, reemplazando el sistema JWT personalizado anterior.

## 🚀 Características

- ✅ **Autenticación AWS Cognito**: Uso de User Pool para gestión segura de usuarios
- ✅ **JWT Authorizer**: Validación automática de tokens por API Gateway
- ✅ **Roles de usuario**: admin, responsable, usuario
- ✅ **47 Lambda Functions**: Sistema de gestión de espacios completo
- ✅ **DynamoDB**: Base de datos NoSQL con diseño single-table
- ✅ **SQS**: Procesamiento asíncrono de tareas

## 🏗️ Arquitectura

```
Frontend (React/Vue/Angular)
    ↓
API Gateway (HTTP API) + JWT Authorizer
    ↓
Lambda Functions (47 funciones)
    ↓
DynamoDB + SQS + Cognito User Pool
```

## 📋 Requisitos

- Node.js 18+
- AWS CLI configurado
- Serverless Framework v3
- Credenciales AWS con permisos para:
  - CloudFormation
  - Lambda
  - API Gateway
  - DynamoDB
  - SQS
  - Cognito

## 🛠️ Instalación y Despliegue

### 1. Instalar dependencias
```bash
npm install
```

### 2. Desplegar en AWS
```bash
# Desarrollo
npm run deploy

# Producción
npm run deploy:prod
```

### 3. Obtener información del despliegue
```bash
npm run info
```

Esto te dará:
- URL de la API
- User Pool ID
- User Pool Client ID
- Otros recursos creados

## 👥 Gestión de Usuarios

### Crear usuarios de prueba

Usa el script incluido para gestionar usuarios:

```bash
# Crear administrador
node scripts/cognito-users.js create admin@empresa.com Admin123! admin "Dr. Juan" "Pérez"

# Crear responsable
node scripts/cognito-users.js create responsable@empresa.com Resp123! responsable "María" "González"

# Crear usuario final
node scripts/cognito-users.js create usuario@empresa.com User123! usuario "Carlos" "Martínez"

# Listar usuarios
node scripts/cognito-users.js list

# Eliminar usuario
node scripts/cognito-users.js delete usuario@empresa.com
```

### Variables de entorno para el script

```bash
export USER_POOL_ID="us-east-1_XXXXXXXXX"
export AWS_REGION="us-east-1"
```

## 🔐 Autenticación

### 1. Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin@empresa.com",
  "password": "Admin123!"
}
```

**Respuesta:**
```json
{
  "ok": true,
  "idToken": "eyJhbGciOiJSUzI1NiIs...",
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIs...",
  "expiresIn": 3600
}
```

### 2. Usar endpoints protegidos
```bash
GET /api/dashboard
Authorization: Bearer <idToken>
```

### 3. Refrescar tokens
```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

### 4. Obtener información del usuario
```bash
GET /api/me
Authorization: Bearer <idToken>
```

## 📊 Endpoints Disponibles

### Autenticación
- `POST /api/auth/login` - Login con Cognito
- `POST /api/auth/refresh` - Refrescar tokens
- `GET /api/me` - Información del usuario autenticado
- `POST /api/auth/register` - Registro (implementar según necesidades)
- `POST /api/auth/logout` - Logout (implementar según necesidades)

### Dashboard
- `GET /api/dashboard` - Dashboard principal
- `GET /api/dashboard/estadisticas` - Estadísticas detalladas

### Espacios (7 endpoints)
- `GET /api/espacios` - Listar espacios
- `GET /api/espacios/{id}` - Obtener espacio
- `POST /api/espacios` - Crear espacio
- `PUT /api/espacios/{id}` - Actualizar espacio
- `DELETE /api/espacios/{id}` - Eliminar espacio
- `GET /api/espacios/estadisticas` - Estadísticas

### Reservas (7 endpoints)
- `GET /api/reservas` - Listar reservas
- `GET /api/reservas/{id}` - Obtener reserva
- `POST /api/reservas` - Crear reserva
- `PUT /api/reservas/{id}` - Actualizar reserva
- `PATCH /api/reservas/{id}/cancel` - Cancelar reserva
- `DELETE /api/reservas/{id}` - Eliminar reserva
- `GET /api/reservas/estadisticas` - Estadísticas

### Usuarios (8 endpoints)
- `GET /api/usuarios` - Listar usuarios
- `GET /api/usuarios/{id}` - Obtener usuario
- `POST /api/usuarios` - Crear usuario
- `PUT /api/usuarios/{id}` - Actualizar usuario
- `DELETE /api/usuarios/{id}` - Eliminar usuario
- `PATCH /api/usuarios/{id}/toggle` - Activar/desactivar
- `GET /api/usuarios/perfil` - Perfil actual
- `PUT /api/usuarios/perfil` - Actualizar perfil
- `POST /api/usuarios/cambiar-password` - Cambiar contraseña

### Recursos (9 endpoints)
- `GET /api/recursos` - Listar recursos
- `GET /api/recursos/{id}` - Obtener recurso
- `POST /api/recursos` - Crear recurso
- `PUT /api/recursos/{id}` - Actualizar recurso
- `DELETE /api/recursos/{id}` - Eliminar recurso
- `PATCH /api/recursos/{id}/disponibilidad` - Toggle disponibilidad
- `GET /api/recursos/tipo/{tipo}` - Por tipo
- `GET /api/recursos/estadisticas` - Estadísticas
- `GET /api/recursos/buscar` - Buscar recursos

### Responsables (9 endpoints)
- `GET /api/responsables` - Listar responsables
- `GET /api/responsables/{id}` - Obtener responsable
- `POST /api/responsables` - Crear responsable
- `PUT /api/responsables/{id}` - Actualizar responsable
- `DELETE /api/responsables/{id}` - Eliminar responsable
- `PATCH /api/responsables/{id}/toggle` - Activar/desactivar
- `GET /api/responsables/area/{area}` - Por área
- `GET /api/responsables/{id}/espacios` - Espacios asignados
- `POST /api/responsables/{id}/asignar-espacio` - Asignar espacio
- `GET /api/responsables/estadisticas` - Estadísticas

### Zonas (10 endpoints)
- `GET /api/zonas` - Listar zonas
- `GET /api/zonas/{id}` - Obtener zona
- `POST /api/zonas` - Crear zona
- `PUT /api/zonas/{id}` - Actualizar zona
- `DELETE /api/zonas/{id}` - Eliminar zona
- `PATCH /api/zonas/{id}/toggle` - Activar/desactivar
- `GET /api/zonas/piso/{piso}` - Por piso
- `GET /api/zonas/{id}/espacios` - Espacios de zona
- `GET /api/zonas/estadisticas` - Estadísticas
- `GET /api/zonas/pisos` - Pisos disponibles
- `GET /api/zonas/edificios` - Edificios disponibles

## 🔒 Autorización

### Roles de Usuario

1. **admin**: Acceso completo a todas las funcionalidades
2. **responsable**: Gestión de espacios asignados y recursos
3. **usuario**: Consulta y creación de reservas

### Claims de Cognito

Los endpoints protegidos reciben automáticamente las claims del token JWT:

```javascript
// En cualquier handler protegido
const { getUserFromCognito } = require('../utils/cognitoAuth');

const handler = async (event) => {
  const user = getUserFromCognito(event);
  console.log('Usuario autenticado:', user);
  // user contiene: id, email, rol, nombre, apellido, etc.
};
```

## 🧪 Desarrollo Local

```bash
# Ejecutar localmente
npm run dev
```

**Nota importante**: El JWT Authorizer de Cognito no funciona con `serverless offline`. Para desarrollo local, considera:

1. Usar mocks en los handlers
2. Desplegar en un entorno de desarrollo en AWS
3. Implementar un authorizer personalizado para desarrollo local

## 📚 Testing

### Probar login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@empresa.com","password":"Admin123!"}'
```

### Probar endpoint protegido (reemplazar TOKEN)
```bash
curl -X GET http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer <ID_TOKEN>"
```

## 🗂️ Estructura del Proyecto

```
aws-node-sls-starter/
├── src/
│   ├── handlers/
│   │   ├── cognitoAuth.js     # Autenticación con Cognito
│   │   ├── auth.js            # Handlers de auth tradicionales
│   │   ├── dashboard.js       # Dashboard
│   │   ├── espacios.js        # Gestión de espacios
│   │   ├── reservas.js        # Gestión de reservas
│   │   ├── usuarios.js        # Gestión de usuarios
│   │   ├── recursos.js        # Gestión de recursos
│   │   ├── responsables.js    # Gestión de responsables
│   │   ├── zonas.js           # Gestión de zonas
│   │   └── queueWorker.js     # Procesador SQS
│   ├── utils/
│   │   ├── cognitoAuth.js     # Utilidades de Cognito
│   │   ├── auth.js            # Utilidades de auth tradicional
│   │   └── responses.js       # Respuestas HTTP
│   └── database/
│       └── DynamoDBManager.js # Manager de DynamoDB
├── scripts/
│   └── cognito-users.js       # Script de gestión de usuarios
├── serverless.yml             # Configuración Serverless
└── package.json
```

## 🌟 Ventajas de la Migración a Cognito

1. **Seguridad mejorada**: AWS gestiona la seguridad de tokens
2. **Escalabilidad**: Cognito maneja millones de usuarios
3. **Compliance**: Certificaciones SOC, PCI DSS, HIPAA
4. **Funcionalidades avanzadas**: MFA, recuperación de contraseña, etc.
5. **Autorización automática**: API Gateway valida tokens sin código adicional
6. **Gestión centralizada**: Un solo lugar para gestionar usuarios

## 🔧 Comandos Útiles

```bash
# Desarrollo
npm run dev

# Despliegue
npm run deploy

# Información del stack
npm run info

# Ver logs
npm run logs:worker

# Eliminar stack
npm run remove

# Gestión de usuarios
node scripts/cognito-users.js help
```

## ⚠️ Notas Importantes

1. **Serverless Offline**: El JWT Authorizer no funciona localmente
2. **Variables de entorno**: Configura USER_POOL_ID para el script de usuarios
3. **Roles personalizados**: Se almacenan en el atributo `custom:role`
4. **Tokens**: Usa `idToken` para autorización, no `accessToken`
5. **Seguridad**: Nunca expongas el USER_POOL_CLIENT_ID en el frontend

## 🆘 Solución de Problemas

### Error: "No se encontraron claims de autenticación"
- Verifica que estés usando el `idToken`, no el `accessToken`
- Confirma que el header sea `Authorization: Bearer <token>`

### Error: "Credenciales inválidas"
- Verifica que el usuario existe en Cognito
- Confirma que la contraseña es correcta
- Revisa que el usuario esté confirmado

### Error: "No tienes permisos"
- Verifica que el usuario tenga el rol correcto en `custom:role`
- Confirma que el endpoint requiera el rol apropiado

### JWT Authorizer no funciona local
- Es limitación conocida de serverless-offline
- Usa despliegue en AWS para pruebas completas
