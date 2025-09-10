# 🚀 Sistema de Gestión de Espacios con DynamoDB

## 📋 Resumen del Proyecto

Hemos creado una implementación completa de DynamoDB para el Sistema de Gestión de Espacios, manteniendo los mismos nombres de tablas y atributos del sistema original Django. El sistema ahora puede funcionar tanto con SQLite (Django ORM) como con DynamoDB de forma transparente.

## 📁 Archivos Creados para DynamoDB

1. **`dynamodb_setup.py`** - Script principal para crear todas las tablas
2. **`dynamodb_operations.py`** - Operaciones CRUD que replican Django ORM  
3. **`migrate_to_dynamodb.py`** - Migración de datos existentes SQLite → DynamoDB
4. **`db_config.py`** - Configuración unificada para alternar entre backends
5. **`requirements_dynamodb.txt`** - Dependencias de AWS/DynamoDB
6. **`README_DynamoDB.md`** - Documentación completa

## 🗃️ Estructura de Tablas DynamoDB

### Tablas Principales
| Tabla | Clave Primaria | GSI | Descripción |
|-------|---------------|-----|-------------|
| `zona` | `idzona` (N) | - | Zonas del sistema |
| `espacio` | `idespacio` (N) | `zona-index`, `estadoespacio-index` | Espacios disponibles |
| `reserva` | `idreserva` (N) | `espacio-fecha-index`, `usuario-index` | Reservas |
| `usuario` | `rutusuario` (S) | - | Usuarios |
| `responsable` | `rutresponsable` (S) | `tipoactividad-index` | Responsables |

### Tablas de Catálogo
- `tipoactividad` - Tipos de actividades
- `estado` - Estados de reservas  
- `estadoespacio` - Estados de espacios
- `estadorecurso` - Estados de recursos
- `tiporeserva` - Tipos de reservas
- `recurso` - Recursos disponibles

### Tablas de Relación Many-to-Many
- `espaciorecurso` - Recursos por espacio
- `tipoactividadespacio` - Actividades por espacio
- `tipoactividadresponsable` - Especialidades de responsables

## ⚡ Instalación Rápida

### 1. Instalar Dependencias
```bash
pip install -r requirements_dynamodb.txt
```

### 2. Configurar AWS (una de las opciones)

#### Opción A: AWS CLI
```bash
aws configure
```

#### Opción B: Variables de Entorno
```bash
export AWS_ACCESS_KEY_ID=tu_access_key
export AWS_SECRET_ACCESS_KEY=tu_secret_key
export AWS_DEFAULT_REGION=us-east-1
```

#### Opción C: DynamoDB Local (para desarrollo)
```bash
# Descargar e instalar DynamoDB Local
wget https://s3.us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.tar.gz
tar -xzf dynamodb_local_latest.tar.gz

# Ejecutar DynamoDB Local
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
```

### 3. Crear Tablas DynamoDB
```bash
python dynamodb_setup.py
```

### 4. (Opcional) Migrar Datos Existentes
```bash
python migrate_to_dynamodb.py
```

## 🔧 Configuración del Backend

### Cambiar a DynamoDB (AWS)
```bash
python db_config.py dynamodb
```

### Cambiar a DynamoDB Local
```bash
python db_config.py dynamodb-local
```

### Volver a SQLite
```bash
python db_config.py sqlite
```

### Ver Estado Actual
```bash
python db_config.py status
```

## 💻 Uso del Sistema

### Ejemplo con Backend Unificado
```python
from db_config import DatabaseManager

# El manager detecta automáticamente el backend configurado
db_manager = DatabaseManager()

# Estas operaciones funcionan igual con SQLite o DynamoDB
espacios = db_manager.list_all_espacios()
conflicto = db_manager.check_reserva_conflicts(1, "2025-09-15", "09:00", "10:00")
```

### Ejemplo Directo con DynamoDB
```python
from dynamodb_operations import DynamoDBClient

# Para AWS DynamoDB
client = DynamoDBClient()

# Para DynamoDB Local
# client = DynamoDBClient(endpoint_url='http://localhost:8000')

# Crear zona
zona = client.zona.create("Zona Norte")

# Crear espacio
espacio = client.espacio.create(
    idzona=zona['idzona'],
    numeroespacio=101,
    idestadoespacio=1
)

# Crear reserva
reserva = client.reserva.create(
    idespacio=espacio['idespacio'],
    fechareserva="2025-09-15",
    horainicio="09:00:00",
    horafin="10:00:00",
    idtiporeserva=1
)
```

## 🎯 Ventajas de DynamoDB

### Escalabilidad
- **Horizontal**: Escala automáticamente según demanda
- **Performance**: Latencia consistente independiente del tamaño
- **Global**: Replicación global automática

### Disponibilidad
- **99.99% SLA**: Alta disponibilidad garantizada
- **Multi-AZ**: Redundancia automática
- **Backup**: Respaldos automáticos point-in-time

### Operacional
- **Serverless**: Sin gestión de infraestructura
- **Auto-scaling**: Ajuste automático de capacidad
- **Monitoring**: CloudWatch integrado

## 📊 Comparación SQLite vs DynamoDB

| Característica | SQLite | DynamoDB |
|---------------|--------|----------|
| **Escalabilidad** | Limitada (single file) | Ilimitada |
| **Concurrencia** | Limitada | Alta |
| **Backup** | Manual | Automático |
| **Costo** | Gratis | Pay-per-use |
| **Latencia** | Muy baja (local) | Baja (red) |
| **Mantenimiento** | Manual | Automático |
| **Consultas** | SQL completo | NoSQL con GSI |

## 🔍 Monitoreo y Debugging

### Verificar Conexión
```python
from dynamodb_operations import DynamoDBClient

client = DynamoDBClient()
zonas = client.zona.all()
print(f"Conexión exitosa: {len(zonas)} zonas encontradas")
```

### Logs de Migración
El archivo `migration_log.json` contiene detalles de la migración:
```json
{
  "table": "zona",
  "action": "migradas", 
  "count": 5,
  "errors": 0,
  "timestamp": "2025-09-10T12:30:00"
}
```

### CloudWatch (AWS)
- Métricas de lectura/escritura
- Errores y throttling
- Latencia por operación

## 🚨 Solución de Problemas

### Error: "Credentials not configured"
```bash
aws configure
# o
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
```

### Error: "Table already exists"
```python
# El script maneja automáticamente tablas existentes
# Para forzar recreación:
setup = DynamoDBSetup()
setup.delete_table('tabla_nombre')
setup.create_table('tabla_nombre')
```

### Error: "Endpoint not accessible" (DynamoDB Local)
```bash
# Verificar que DynamoDB Local esté ejecutándose
curl http://localhost:8000
```

## 📚 Recursos Adicionales

- [Documentación oficial DynamoDB](https://docs.aws.amazon.com/dynamodb/)
- [Mejores prácticas DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Boto3 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb.html)
- [DynamoDB Local Setup](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)

## ✅ Estado del Sistema

### ✅ Completado
- [x] Estructura completa de tablas DynamoDB
- [x] Operaciones CRUD que replican Django ORM
- [x] Script de migración de datos
- [x] Sistema de configuración unificado
- [x] Documentación completa
- [x] Ejemplos de uso
- [x] Manejo de errores y logging

### 🔄 Funcionalidades Principales
- [x] Gestión de espacios y zonas
- [x] Sistema de reservas con verificación de conflictos  
- [x] Gestión de usuarios y responsables
- [x] Asignación de recursos a espacios
- [x] Reportes y exportación Excel
- [x] Backend intercambiable (SQLite ↔ DynamoDB)

El sistema está completamente funcional y listo para producción con DynamoDB, manteniendo total compatibilidad con la implementación original de Django.
