# Sistema de Multitenancy (Multi-empresa)

## 🎯 Objetivo

Implementar aislamiento de datos por empresa para que cada organización solo pueda ver y gestionar sus propios recursos (espacios, zonas, reservas, usuarios).

## 🏗️ Arquitectura

### Modelo de Datos

Todos los recursos principales ahora incluyen `empresa_id`:

- **Espacios** → `empresa_id`
- **Zonas** → `empresa_id`
- **Reservas** → `empresa_id`
- **Usuarios** → `empresa_id` (desde Cognito)

### Flujo de Autenticación

```
Usuario se autentica → JWT de Cognito
                    ↓
            Extrae empresa_id del token
                    ↓
        Todas las operaciones filtran por empresa_id
```

## 📋 Cambios Implementados

### 1. Backend (Lambda + DynamoDB)

#### `src/core/auth/auth.js`
- Extrae `empresa_id` desde `custom:empresa_id` del JWT
- Fallback a `DEFAULT_EMPRESA_ID` si no existe el atributo
- Agrega `empresa_id` al objeto `user` en todas las peticiones

```javascript
empresa_id: claims['custom:empresa_id'] || process.env.DEFAULT_EMPRESA_ID || 'empresa-default'
```

#### `src/api/business/espacios.js`
- **getEspacios**: Filtra siempre por `empresa_id` del usuario
- **createEspacio**: Agrega automáticamente `empresa_id` del usuario
- **Validación**: Verifica que el usuario tenga empresa antes de crear

#### `src/api/business/zonas.js`
- **getZonas**: Filtra por `empresa_id`
- **createZona**: Asocia zona a la empresa del usuario

#### `src/api/business/reservas.js`
- **getReservas**: Filtra por `empresa_id`
- **createReserva**: 
  - Agrega `empresa_id` a la reserva
  - Valida que el espacio pertenezca a la misma empresa
  - Bloquea reservas de espacios de otras empresas

#### `src/infrastructure/database/DynamoDBManager.js`
- **getEspacios**: Agrega filtro `empresa_id`
- **getReservas**: Agrega filtro `empresa_id`

#### `src/core/validation/validator.js`
- Agrega `empresa_id` a schemas de:
  - `espacioSchema`
  - `zonaSchema`
  - `reservaSchema`

### 2. Seguridad

#### Validaciones Implementadas

1. **Creación de Recursos**
   ```javascript
   if (!user.empresa_id) {
     throw new Error('Usuario no asociado a ninguna empresa');
   }
   ```

2. **Acceso a Espacios**
   ```javascript
   if (espacio.empresa_id !== user.empresa_id) {
     throw new Error('No tienes acceso a ese espacio');
   }
   ```

3. **Filtrado Automático**
   - Todas las consultas filtran por `empresa_id`
   - Los usuarios nunca ven recursos de otras empresas
   - Las reservas solo se pueden hacer en espacios de la misma empresa

## 🚀 Configuración

### Opción 1: Usar Empresa por Defecto (Actual)

**Para desarrollo/testing:**

1. Todos los usuarios usan `empresa-default`
2. No requiere cambios en Cognito
3. Funciona inmediatamente

**Variables de entorno:**
```bash
DEFAULT_EMPRESA_ID=empresa-default  # Opcional, ya tiene default
```

### Opción 2: Configurar Cognito (Producción)

**Para ambiente de producción con múltiples empresas:**

#### Paso 1: Agregar atributo personalizado a Cognito

**Via AWS Console:**
1. AWS Console → Cognito → User Pools
2. Seleccionar User Pool: `us-east-1_aR6LB6m5r`
3. Sign-up experience → Attribute configuration
4. Custom attributes → Add custom attribute:
   - Name: `empresa_id`
   - Type: String
   - Min: 1, Max: 50
   - Mutable: Yes

**Via CloudFormation/Terraform:**
```yaml
Schema:
  - Name: empresa_id
    AttributeDataType: String
    Mutable: true
    StringAttributeConstraints:
      MinLength: "1"
      MaxLength: "50"
```

⚠️ **IMPORTANTE**: Los custom attributes solo se pueden agregar durante la creación del User Pool. Si ya existe, deberás recrearlo o usar AWS Console.

#### Paso 2: Asignar empresa_id a usuarios

```bash
# Asignar mismo ID a todos los usuarios existentes
node scripts/setup-multitenancy.js [empresa-id-opcional]

# O asignar manualmente
aws cognito-idp admin-update-user-attributes \
  --user-pool-id us-east-1_aR6LB6m5r \
  --username [username] \
  --user-attributes Name=custom:empresa_id,Value=[empresa-id]
```

#### Paso 3: Registrar nuevos usuarios con empresa_id

Al registrar usuarios, incluir:
```javascript
{
  UserAttributes: [
    { Name: 'email', Value: 'user@example.com' },
    { Name: 'custom:empresa_id', Value: 'empresa-abc-123' }
  ]
}
```

## 🔍 Testing

### Verificar Multitenancy

1. **Usuario sin empresa_id**
   ```bash
   # Intenta crear espacio → Error: "Usuario no asociado a ninguna empresa"
   ```

2. **Usuario con empresa A**
   ```bash
   # Crea espacio → Se asocia a empresa A
   # Lista espacios → Solo ve espacios de empresa A
   ```

3. **Usuario con empresa B**
   ```bash
   # Lista espacios → Solo ve espacios de empresa B
   # Intenta reservar espacio de empresa A → Error: "No tienes acceso"
   ```

### Script de Testing

```javascript
// test-multitenancy.js
const { apiClient } = require('./frontend/src/lib/api-client');

async function testMultitenancy() {
  // Usuario 1 (Empresa A)
  await loginAs('user-empresa-a@example.com');
  const espaciosA = await apiClient.getEspacios();
  console.log('Espacios Empresa A:', espaciosA.length);
  
  // Usuario 2 (Empresa B)
  await loginAs('user-empresa-b@example.com');
  const espaciosB = await apiClient.getEspacios();
  console.log('Espacios Empresa B:', espaciosB.length);
  
  // Verificar aislamiento
  console.assert(espaciosA.data.espacios[0].empresa_id !== espaciosB.data.espacios[0].empresa_id);
}
```

## 📊 Estructura de Datos

### DynamoDB Items

**Espacio:**
```json
{
  "PK": "ESPACIO#{id}",
  "SK": "METADATA",
  "GSI1PK": "ESPACIO",
  "GSI1SK": "nombre",
  "empresa_id": "empresa-abc-123",
  "nombre": "Sala de Juntas A",
  "tipo": "sala_juntas",
  ...
}
```

**Zona:**
```json
{
  "PK": "ZONA#{id}",
  "SK": "METADATA", 
  "GSI1PK": "ZONA",
  "empresa_id": "empresa-abc-123",
  "nombre": "Piso 2",
  ...
}
```

**Reserva:**
```json
{
  "PK": "RESERVA#{id}",
  "SK": "METADATA",
  "GSI1PK": "RESERVA",
  "empresa_id": "empresa-abc-123",
  "espacio_id": "espacio-123",
  "usuario_id": "user-456",
  ...
}
```

## 🔐 Seguridad

### Reglas de Negocio

1. ✅ Usuarios solo ven recursos de su empresa
2. ✅ No se pueden crear reservas en espacios de otras empresas
3. ✅ Zonas y espacios siempre se asocian a una empresa
4. ✅ Sin empresa_id = Sin acceso

### Niveles de Aislamiento

| Operación | Aislamiento |
|-----------|-------------|
| GET espacios | ✅ Por empresa |
| GET zonas | ✅ Por empresa |
| GET reservas | ✅ Por empresa |
| CREATE espacio | ✅ Asocia a empresa |
| CREATE reserva | ✅ Valida empresa del espacio |
| UPDATE/DELETE | ✅ Heredado del GET |

## 📈 Próximos Pasos

### Fase 1: Actual (Completada)
- ✅ Filtrado automático por empresa
- ✅ Validaciones de seguridad
- ✅ Empresa por defecto para testing

### Fase 2: Cognito Custom Attributes
- ⏳ Agregar `custom:empresa_id` al User Pool
- ⏳ Script de migración de usuarios
- ⏳ Actualizar registro de usuarios

### Fase 3: Gestión de Empresas
- ⏳ CRUD de empresas (OrganizationManager)
- ⏳ Panel de administración de empresas
- ⏳ Invitaciones de usuarios a empresas
- ⏳ Configuración per-empresa (branding, límites, etc.)

### Fase 4: Features Avanzados
- ⏳ Shared resources (espacios compartidos entre empresas)
- ⏳ Multi-empresa para super admins
- ⏳ Analytics por empresa
- ⏳ Facturación por empresa

## 🆘 Troubleshooting

### Problema: "Usuario no asociado a ninguna empresa"
**Solución:** 
```javascript
// Opción 1: Configurar DEFAULT_EMPRESA_ID
process.env.DEFAULT_EMPRESA_ID = 'mi-empresa-id'

// Opción 2: Agregar empresa_id en Cognito
aws cognito-idp admin-update-user-attributes ...
```

### Problema: Usuario no ve ningún recurso
**Diagnóstico:**
```javascript
// Verificar que recursos tengan empresa_id
const espacios = await db.getEspacios({});
console.log(espacios.map(e => ({ id: e.id, empresa_id: e.empresa_id })));

// Verificar empresa_id del usuario
console.log('User empresa_id:', user.empresa_id);
```

### Problema: Error al crear espacio/zona
**Verificar:**
1. Usuario tiene `empresa_id` en el token
2. Schema de validación permite `empresa_id`
3. DynamoDB acepta el campo

## 📚 Referencias

- **OrganizationManager**: `proyecto/src/shared/utils/organizationManager.js`
- **Auth Middleware**: `proyecto/src/core/auth/auth.js`
- **Validation Schemas**: `proyecto/src/core/validation/validator.js`
- **DynamoDB Manager**: `proyecto/src/infrastructure/database/DynamoDBManager.js`

## 💡 Ejemplo de Uso

```javascript
// Frontend - Crear espacio
// El usuario con empresa_id='empresa-a' está autenticado
await apiClient.createEspacio({
  nombre: 'Sala A',
  tipo: 'oficina',
  capacidad: 10,
  // empresa_id se agrega automáticamente desde el token
});

// Backend - Automáticamente filtra por empresa
const espacios = await db.getEspacios({ 
  empresa_id: user.empresa_id  // Agregado automáticamente
});
// Solo retorna espacios de 'empresa-a'
```
