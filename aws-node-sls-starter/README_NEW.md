# Sistema de Gestión de Espacios Hospitalarios - Serverless

Sistema completo de gestión de espacios hospitalarios desarrollado con **AWS Lambda + API Gateway HTTP + DynamoDB + SQS** usando **Node.js 20** y **Serverless Framework v3**.

## Características

- **Autenticación JWT**: Sistema completo de login/logout con roles (admin, responsable, usuario)
- **Gestión de Espacios**: CRUD completo para espacios hospitalarios con estados y filtros
- **Sistema de Reservas**: Reservas con validación de conflictos y permisos por rol
- **Gestión de Usuarios**: Administración completa de usuarios con diferentes roles
- **Recursos**: Inventario de recursos médicos y equipos
- **Responsables**: Gestión de personal responsable de áreas
- **Zonas**: Organización por zonas, pisos y edificios
- **Dashboard**: Estadísticas y métricas en tiempo real
- **Base de Datos**: DynamoDB con modelo single-table optimizado
- **Cola SQS**: Procesamiento asíncrono de tareas

## Requisitos

- Node.js 18+ (ideal 20)
- Cuenta AWS con credenciales configuradas localmente (`aws configure`)
- Permisos para CloudFormation, Lambda, API Gateway, DynamoDB, SQS
- `npm install` para instalar dependencias

## Instalación

```bash
# Clonar e instalar dependencias
git clone <repo>
cd aws-node-sls-starter
npm install
```

## Configuración

1. **Variables de entorno**: Copia y modifica el archivo `.env`:
```bash
cp .env.example .env
```

2. **Credenciales AWS**: Asegúrate de tener configuradas tus credenciales:
```bash
aws configure
```

## Despliegue

### Desarrollo (us-east-1)
```bash
npm run deploy
# o:
npx serverless deploy --stage dev --region us-east-1
```

### Producción
```bash
npm run deploy:prod
# o:
npx serverless deploy --stage prod --region us-east-1
```

### Obtener información del despliegue
```bash
npm run info
```

## Desarrollo Local

```bash
npm run dev
# Servidor local en http://localhost:3000
```

> **Nota**: El modo offline cubre HTTP API. Para SQS local, usa LocalStack con el plugin `serverless-offline-sqs`.

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `POST /api/auth/register` - Registrar usuario (admin)

### Dashboard
- `GET /api/dashboard` - Dashboard principal
- `GET /api/dashboard/estadisticas` - Estadísticas detalladas (admin)

### Espacios
- `GET /api/espacios` - Listar espacios
- `GET /api/espacios/{id}` - Obtener espacio
- `POST /api/espacios` - Crear espacio (admin/responsable)
- `PUT /api/espacios/{id}` - Actualizar espacio (admin/responsable)
- `DELETE /api/espacios/{id}` - Eliminar espacio (admin)
- `GET /api/espacios/estadisticas` - Estadísticas de espacios

### Reservas
- `GET /api/reservas` - Listar reservas
- `GET /api/reservas/{id}` - Obtener reserva
- `POST /api/reservas` - Crear reserva
- `PUT /api/reservas/{id}` - Actualizar reserva
- `PATCH /api/reservas/{id}/cancel` - Cancelar reserva
- `DELETE /api/reservas/{id}` - Eliminar reserva (admin)
- `GET /api/reservas/estadisticas` - Estadísticas de reservas

### Usuarios
- `GET /api/usuarios` - Listar usuarios (admin)
- `GET /api/usuarios/{id}` - Obtener usuario
- `POST /api/usuarios` - Crear usuario (admin)
- `PUT /api/usuarios/{id}` - Actualizar usuario
- `DELETE /api/usuarios/{id}` - Eliminar usuario (admin)
- `PATCH /api/usuarios/{id}/toggle` - Activar/desactivar usuario (admin)
- `GET /api/usuarios/perfil` - Perfil actual
- `PUT /api/usuarios/perfil` - Actualizar perfil
- `POST /api/usuarios/cambiar-password` - Cambiar contraseña

## Testing

### Probar la API
```bash
# Obtener URL base
URL=$(npx serverless info --verbose | grep HttpApiUrl | awk '{print $2}')

# Login
curl -X POST "$URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@hospital.com","password":"password123"}'

# Usar token en requests
TOKEN="your_jwt_token"
curl -H "Authorization: Bearer $TOKEN" "$URL/api/dashboard"
```

## Roles y Permisos

### Administrador (`admin`)
- Acceso completo a todas las funcionalidades
- Gestión de usuarios, espacios, recursos, responsables y zonas
- Visualización de todas las estadísticas

### Responsable (`responsable`)
- Gestión de espacios asignados
- Creación y gestión de recursos
- Visualización de estadísticas de su área

### Usuario (`usuario`)
- Visualización de espacios disponibles
- Creación y gestión de sus propias reservas
- Actualización de su perfil personal

## Desarrollo Local

```bash
npm run dev
# Servidor local en http://localhost:3000
```

## Logs y Monitoreo

```bash
# Ver logs del worker
npm run logs:worker

# Ver logs de una función específica
npx serverless logs -f login -t

# Información del stack
npx serverless info --verbose
```

## Limpieza

```bash
# Eliminar stack completo
npm run remove
# o:
npx serverless remove
```

## Datos de Prueba

Para poblar la base de datos con datos de prueba, puedes usar la función de registro para crear el primer usuario administrador:

```bash
curl -X POST "$URL/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{
    "nombre": "Admin",
    "apellido": "Hospital",
    "email": "admin@hospital.com",
    "password": "password123",
    "rol": "admin"
  }'
```

## Migración desde Node.js/Express

Si vienes del sistema anterior Node.js/Express, este sistema serverless ofrece:

- **Escalabilidad automática**: Sin preocupaciones por servidores
- **Costo optimizado**: Solo pagas por uso real
- **Alta disponibilidad**: Infraestructura gestionada por AWS
- **API idéntica**: Mismos endpoints y funcionalidades
- **DynamoDB**: Base de datos NoSQL optimizada para cloud
