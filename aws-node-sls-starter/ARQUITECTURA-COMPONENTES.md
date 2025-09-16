# 🏗️ Arquitectura de Componentes - Sistema de Gestión de Espacios

Este proyecto implementa una arquitectura de 3 componentes principales siguiendo las mejores prácticas de SaaS y seguridad empresarial.

## 📋 Componentes Principales

### 1. 🔐 Componente Login

**Características implementadas:**
- ✅ **Utiliza SaaS**: AWS Cognito como servicio de autenticación
- ✅ **Utiliza JWT**: Tokens JWT estándar con validación automática
- ✅ **Tiempo < 5 minutos**: Access Token = 4 minutos, ID Token = 4 minutos
- ✅ **Métodos REST**: Endpoints HTTP POST/GET estándar

**Endpoints:**
```
POST /api/auth/login          - Autenticación con Cognito
POST /api/auth/refresh        - Renovación de tokens  
GET  /api/me                  - Información del usuario actual
POST /api/auth/logout         - Cierre de sesión
```

**Configuración de tokens:**
```yaml
AccessTokenValidity: 4        # 4 minutos
IdTokenValidity: 4           # 4 minutos  
RefreshTokenValidity: 1      # 1 día
```

### 2. 🛡️ Componente Autenticación

**Características implementadas:**
- ✅ **Repositorio de permisos**: `src/utils/permissions.js` con 40+ permisos específicos
- ✅ **Gestión de roles**: Sistema granular (admin, responsable, usuario)
- ✅ **Principio mínimo permiso**: Cada rol tiene solo permisos necesarios

**Repositorio de Permisos:**
```javascript
// Ejemplo de permisos específicos
ESPACIOS_READ: 'espacios:read'
ESPACIOS_CREATE: 'espacios:create'
RESERVAS_UPDATE: 'reservas:update'
ADMIN_FULL_ACCESS: 'admin:full_access'
```

**Roles con Mínimo Privilegio:**
```javascript
usuario: [
  'espacios:read',
  'reservas:read',    // Solo sus propias reservas
  'usuarios:read_profile'
],
responsable: [
  ...permisos_usuario,
  'espacios:update',  // Solo espacios asignados
  'reservas:read_all' // Todas las reservas de sus espacios
],
admin: [
  // Todos los permisos del sistema
]
```

**Middleware de Seguridad:**
```javascript
// DEPRECATED - Verificación por roles
withAuth(handler, ['admin', 'responsable'])

// NUEVO - Verificación por permisos específicos
withPermissions(handler, [PERMISSIONS.ESPACIOS_CREATE])
```

### 3. ⚙️ Componente Gestión Personalización

**Características implementadas:**
- ✅ **Utiliza SaaS**: DynamoDB como repositorio de configuraciones
- ✅ **Parámetros globales**: Configuración por cliente/organización
- ✅ **Parámetros específicos**: Configuración por usuario individual
- ✅ **Mecanismo desacople**: Carga desde variables de entorno, archivos, APIs externas

**Endpoints de Personalización:**
```
# Configuración Global del Cliente
GET  /api/personalization/client/{clientId}/global
PUT  /api/personalization/client/{clientId}/global

# Configuración Específica del Usuario  
GET  /api/personalization/client/{clientId}/user/{userId}
PUT  /api/personalization/client/{clientId}/user/{userId}

# Configuración Completa (global + específica + externa)
GET  /api/personalization/client/{clientId}/user/{userId}/complete

# Mecanismo de Desacople
POST /api/personalization/client/{clientId}/load-external
```

**Configuraciones Disponibles:**
```javascript
{
  ui: {
    theme: 'light',
    primaryColor: '#007bff',
    language: 'es',
    companyName: 'Mi Empresa'
  },
  business: {
    industry: 'generic',
    timezone: 'America/Santiago',
    workingHours: { start: '08:00', end: '18:00' },
    reservationLimits: { maxDaysAdvance: 30 }
  },
  security: {
    sessionTimeout: 240, // 4 minutos
    passwordPolicy: { minLength: 8 }
  }
}
```

**Mecanismo de Desacople:**
```javascript
// Variables de entorno
CLIENT_EMPRESA1_UI_THEME=dark
CLIENT_EMPRESA1_BUSINESS_TIMEZONE=America/New_York

// Carga desde API externa
loadExternalConfig('api', clientId)

// Prioridad: Específico Usuario > Global Cliente > Externa > Default
```

## 🚀 Validación de Requisitos

| Requisito | Estado | Implementación |
|-----------|--------|----------------|
| **Arquitectura 3 componentes** | ✅ | Login + Autenticación + Gestión Personalización |
| **Login SaaS** | ✅ | AWS Cognito |
| **Login JWT** | ✅ | Tokens JWT estándar |
| **Login < 5 min** | ✅ | 4 minutos configurado |
| **Login métodos REST** | ✅ | POST/GET endpoints |
| **Auth repositorio permisos** | ✅ | 40+ permisos en `permissions.js` |
| **Auth gestión roles** | ✅ | 3 roles con permisos específicos |
| **Auth mínimo permiso** | ✅ | Cada rol solo permisos necesarios |
| **Personalización SaaS** | ✅ | DynamoDB + AWS serverless |
| **Personalización global** | ✅ | Configuración por cliente |
| **Personalización usuario** | ✅ | Configuración específica usuario |
| **Personalización desacople** | ✅ | Env vars + APIs externas + archivos |

## 🔧 Uso de la Arquitectura

### Login de Usuario:
```bash
# 1. Login
POST /api/auth/login
{
  "username": "admin@empresa.com",
  "password": "Admin123!"
}

# Respuesta: JWT válido por 4 minutos
{
  "idToken": "eyJ...",
  "accessToken": "eyJ...",
  "expiresIn": 240
}
```

### Verificación de Permisos:
```javascript
// Handler con permisos específicos
const createEspacio = withPermissions(async (event) => {
  // Solo usuarios con permiso ESPACIOS_CREATE pueden acceder
}, [PERMISSIONS.ESPACIOS_CREATE]);
```

### Personalización por Cliente:
```bash
# Configurar tema de empresa
PUT /api/personalization/client/empresa1/global
{
  "ui": {
    "theme": "dark",
    "primaryColor": "#ff6b35",
    "companyName": "Empresa ABC"
  }
}

# Configuración específica de usuario
PUT /api/personalization/client/empresa1/user/123
{
  "ui": {
    "language": "en"  // Usuario prefiere inglés
  }
}
```

## 🎯 Beneficios de esta Arquitectura

1. **Separación de Responsabilidades**: Cada componente tiene función específica
2. **Seguridad Granular**: Permisos específicos vs roles genéricos  
3. **Multi-tenant**: Configuración independiente por cliente
4. **Escalabilidad**: Arquitectura serverless AWS
5. **Flexibilidad**: Configuración externa desacoplada
6. **Cumplimiento**: Tokens cortos y principio mínimo privilegio

Esta arquitectura permite que el sistema sea altamente configurable, seguro y escalable para múltiples clientes con diferentes necesidades.