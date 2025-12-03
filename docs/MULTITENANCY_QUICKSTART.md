# 🏢 Multitenancy - Guía Rápida

## ¿Qué es Multitenancy?

Ahora el sistema soporta **múltiples empresas (tenants)**. Cada empresa tiene sus propios datos aislados:
- ✅ Espacios exclusivos por empresa
- ✅ Zonas exclusivas por empresa  
- ✅ Reservas solo en espacios de la misma empresa
- ✅ Los usuarios no ven recursos de otras empresas

## 🚀 Inicio Rápido

### Opción 1: Testing Inmediato (Empresa por Defecto)

**Ya está funcionando!** Todos los usuarios usan `empresa-default` automáticamente.

```bash
# 1. Inicia sesión como usuario normal
# 2. Crea espacios y zonas
# 3. Todos se asocian automáticamente a "empresa-default"
```

No requiere configuración adicional.

### Opción 2: Múltiples Empresas (Producción)

#### Paso 1: Configurar Cognito

Agrega el atributo `custom:empresa_id` al User Pool:

**AWS Console:**
1. Cognito → User Pools → `us-east-1_aR6LB6m5r`
2. Sign-up experience → Attribute configuration
3. Custom attributes → Add:
   - Name: `empresa_id`
   - Type: String
   - Mutable: Yes

#### Paso 2: Asignar empresa a usuarios

```bash
# Opción A: Script automático (asigna a todos)
cd scripts
node setup-multitenancy.js

# Opción B: Manual por usuario
aws cognito-idp admin-update-user-attributes \
  --user-pool-id us-east-1_aR6LB6m5r \
  --username usuario@example.com \
  --user-attributes Name=custom:empresa_id,Value=empresa-abc-123
```

#### Paso 3: Crear recursos

Los recursos se asocian automáticamente a la empresa del usuario:

```javascript
// Usuario con empresa_id='empresa-abc'
await apiClient.createEspacio({
  nombre: 'Sala A',
  tipo: 'oficina',
  capacidad: 10
});
// → Se crea con empresa_id='empresa-abc'
```

## 📋 Cómo Funciona

### Flujo de Autenticación

```
1. Usuario se loguea
   ↓
2. Cognito retorna JWT con custom:empresa_id
   ↓
3. Backend extrae empresa_id del token
   ↓
4. Todas las operaciones filtran por empresa_id
```

### Creación de Recursos

```javascript
// Backend automáticamente agrega empresa_id
const espacio = await db.createEspacio({
  ...espacioData,
  empresa_id: user.empresa_id  // ← Agregado automáticamente
});
```

### Consulta de Recursos

```javascript
// Backend automáticamente filtra
const espacios = await db.getEspacios({
  empresa_id: user.empresa_id  // ← Filtro automático
});
// Solo retorna espacios de la empresa del usuario
```

### Validación de Acceso

```javascript
// Al crear reserva
if (espacio.empresa_id !== user.empresa_id) {
  throw new Error('No tienes acceso a ese espacio');
}
```

## 🧪 Testing

### Escenario 1: Usuario sin empresa

```javascript
// user.empresa_id = null
await apiClient.createEspacio(...);
// ❌ Error: "Usuario no asociado a ninguna empresa"
```

### Escenario 2: Dos empresas diferentes

```javascript
// Usuario A (empresa-1)
await loginAs('userA@empresa1.com');
await createEspacio('Sala Empresa 1');
const espaciosA = await getEspacios();
// → Retorna solo: [{ nombre: 'Sala Empresa 1', empresa_id: 'empresa-1' }]

// Usuario B (empresa-2)  
await loginAs('userB@empresa2.com');
const espaciosB = await getEspacios();
// → Retorna: [] (no ve espacios de empresa-1)

await createReserva({ espacio_id: espaciosA[0].id });
// ❌ Error: "No tienes acceso a ese espacio"
```

## ⚙️ Configuración

### Variables de Entorno

```bash
# Backend (proyecto/.env)
DEFAULT_EMPRESA_ID=empresa-default  # Opcional, usado como fallback
```

### Frontend

No requiere cambios. El `empresa_id` se maneja automáticamente en el backend desde el JWT.

## 🔍 Verificar Configuración

### 1. Verificar empresa_id del usuario

```bash
# Obtener token JWT del localStorage
# Decodificar en jwt.io
# Buscar: "custom:empresa_id": "..."
```

### 2. Verificar recursos creados

```javascript
// Console del navegador
const espacios = await apiClient.getEspacios();
console.log(espacios.data.espacios.map(e => ({
  nombre: e.nombre,
  empresa_id: e.empresa_id
})));
```

### 3. Logs del backend

```bash
# Ver logs de Lambda
serverless logs -f getEspacios --tail

# Buscar: "empresa_id" en los logs
```

## 🆘 Problemas Comunes

### "Usuario no asociado a ninguna empresa"

**Causa:** Usuario no tiene `custom:empresa_id` en Cognito

**Solución:**
```bash
# Opción 1: Usar empresa por defecto (ya configurado)
# Opción 2: Agregar atributo en Cognito
node scripts/setup-multitenancy.js
```

### "No se crean recursos"

**Verificar:**
1. Usuario tiene `empresa_id`:
   ```javascript
   console.log(user.empresa_id); // Debe tener valor
   ```
2. Schema permite `empresa_id`:
   ```bash
   # Ver: proyecto/src/core/validation/validator.js
   # Debe incluir empresa_id en espacioSchema, zonaSchema, reservaSchema
   ```

### "Usuario ve recursos de otras empresas"

**Verificar:**
```javascript
// En business logic
const filters = {
  empresa_id: user.empresa_id  // ← Debe estar presente
};
const espacios = await db.getEspacios(filters);
```

## 📚 Documentación Completa

Ver `docs/MULTITENANCY.md` para:
- Arquitectura detallada
- Cambios implementados
- Configuración avanzada
- Roadmap

## 💡 Ejemplos

### Registrar nuevo usuario con empresa

```javascript
const { CognitoIdentityProviderClient, SignUpCommand } = require('@aws-sdk/client-cognito-identity-provider');

await cognito.send(new SignUpCommand({
  ClientId: CLIENT_ID,
  Username: 'nuevo@empresa.com',
  Password: 'Password123!',
  UserAttributes: [
    { Name: 'email', Value: 'nuevo@empresa.com' },
    { Name: 'name', Value: 'Usuario Nuevo' },
    { Name: 'custom:empresa_id', Value: 'empresa-abc-123' }  // ← Importante
  ]
}));
```

### Crear espacio para empresa específica

```javascript
// Frontend - No necesitas especificar empresa_id
await apiClient.createEspacio({
  nombre: 'Sala A',
  tipo: 'oficina',
  capacidad: 10
});
// Backend automáticamente usa empresa_id del usuario autenticado
```

### Listar espacios de la empresa

```javascript
// Frontend - Automáticamente filtra por empresa
const response = await apiClient.getEspacios();
// Solo retorna espacios de la empresa del usuario
```

## ✅ Checklist de Implementación

- [x] Backend filtra por empresa_id
- [x] Validaciones de seguridad
- [x] Schemas de validación actualizados
- [x] Empresa por defecto para testing
- [ ] Custom attribute en Cognito (opcional)
- [ ] Script de migración de usuarios
- [ ] Panel de administración de empresas
- [ ] Testing E2E multiempresa

## 🚀 Despliegue

```bash
# Backend
cd proyecto
npx serverless deploy

# Frontend (sin cambios necesarios)
cd frontend
npm run build
aws s3 sync out/ s3://sistema-gestion-espacios-frontend-dev --delete
aws cloudfront create-invalidation --distribution-id EX85UQ1KKM9BI --paths "/*"
```

## 📞 Soporte

Ver logs en caso de problemas:
```bash
serverless logs -f createEspacio --tail
serverless logs -f getEspacios --tail
```
