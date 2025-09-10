# DynamoDB para Sistema de Gestión de Espacios

Este directorio contiene la configuración y operaciones necesarias para migrar el sistema de gestión de espacios de SQLite a Amazon DynamoDB.

## 📁 Archivos Incluidos

- **`dynamodb_setup.py`**: Script principal para crear todas las tablas de DynamoDB
- **`dynamodb_operations.py`**: Managers para operaciones CRUD que replican Django ORM
- **`requirements_dynamodb.txt`**: Dependencias necesarias para DynamoDB
- **`README_DynamoDB.md`**: Esta documentación

## 🚀 Configuración Rápida

### 1. Instalar Dependencias

```bash
pip install -r requirements_dynamodb.txt
```

### 2. Configurar Credenciales AWS

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

#### Opción C: DynamoDB Local (Para desarrollo)
```bash
# Descargar DynamoDB Local
wget https://s3.us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.tar.gz
tar -xzf dynamodb_local_latest.tar.gz

# Ejecutar DynamoDB Local
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
```

### 3. Crear las Tablas

```bash
python dynamodb_setup.py
```

## 📊 Estructura de Tablas

### Tablas Principales

| Tabla | Clave Primaria | GSI | Descripción |
|-------|---------------|-----|-------------|
| `zona` | `idzona` (N) | - | Zonas/áreas del sistema |
| `espacio` | `idespacio` (N) | `zona-index`, `estadoespacio-index` | Espacios/salas disponibles |
| `reserva` | `idreserva` (N) | `espacio-fecha-index`, `usuario-index`, `responsable-index` | Reservas de espacios |
| `usuario` | `rutusuario` (S) | - | Usuarios del sistema |
| `responsable` | `rutresponsable` (S) | `tipoactividad-index` | Responsables de actividades |

### Tablas de Relaciones Many-to-Many

| Tabla | Clave Compuesta | Descripción |
|-------|----------------|-------------|
| `espaciorecurso` | `idrecurso` (HASH) + `idespacio` (RANGE) | Recursos asignados a espacios |
| `tipoactividadespacio` | `idtipoactividad` (HASH) + `idespacio` (RANGE) | Tipos de actividad por espacio |
| `tipoactividadresponsable` | `idtipoactividad` (HASH) + `rutresponsable` (RANGE) | Especialidades de responsables |

### Tablas de Catálogo

| Tabla | Descripción |
|-------|-------------|
| `tipoactividad` | Tipos de actividades (reuniones, capacitación, etc.) |
| `estado` | Estados de reservas (confirmada, pendiente, cancelada) |
| `estadoespacio` | Estados de espacios (disponible, ocupado, mantenimiento) |
| `estadorecurso` | Estados de recursos (disponible, en uso, no disponible) |
| `tiporeserva` | Tipos de reservas (general, especial, VIP) |
| `recurso` | Recursos disponibles (proyector, micrófono, etc.) |

## 💻 Uso del Sistema

### Ejemplo Básico

```python
from dynamodb_operations import DynamoDBClient

# Inicializar cliente
client = DynamoDBClient()

# Para DynamoDB local
# client = DynamoDBClient(endpoint_url='http://localhost:8000')

# Crear una zona
zona = client.zona.create("Zona Norte")

# Crear un espacio
espacio = client.espacio.create(
    idzona=zona['idzona'],
    numeroespacio=101,
    idestadoespacio=1,
    tipoactividadespacio="Sala de reuniones"
)

# Crear un usuario
usuario = client.usuario.create(
    rutusuario="12345678-9",
    nombreusuario="Juan",
    apellidousuario="Pérez"
)

# Crear una reserva
reserva = client.reserva.create(
    idespacio=espacio['idespacio'],
    fechareserva="2025-09-15",
    horainicio="09:00:00",
    horafin="10:00:00",
    idtiporeserva=1,
    rutusuario=usuario['rutusuario']
)

# Verificar conflictos de horario
conflicto = client.reserva.check_conflicts(
    idespacio=espacio['idespacio'],
    fechareserva="2025-09-15",
    horainicio="09:30:00",
    horafin="10:30:00"
)
```

### Operaciones Comunes

#### Consultar Espacios por Zona
```python
espacios = client.espacio.filter_by_zona(1)
```

#### Consultar Reservas por Usuario
```python
reservas_usuario = client.reserva.filter_by_usuario("12345678-9")
```

#### Consultar Reservas por Espacio y Fecha
```python
reservas_dia = client.reserva.filter_by_espacio_fecha(1, "2025-09-15")
```

#### Gestionar Recursos de Espacio
```python
# Asignar recurso a espacio
client.espaciorecurso.create(idrecurso=1, idespacio=1, idestadorecurso=1)

# Cambiar estado de recurso
client.espaciorecurso.update_estado(idrecurso=1, idespacio=1, nuevo_estado=3)
```

## 🔧 Migración desde Django

### Mapeo de Modelos Django → DynamoDB

| Django Model | DynamoDB Table | Cambios Principales |
|-------------|---------------|-------------------|
| `Zona` | `zona` | Sin cambios significativos |
| `Espacio` | `espacio` | GSI para consultas por zona y estado |
| `Reserva` | `reserva` | GSI para consultas eficientes por espacio+fecha |
| `Usuario` | `usuario` | Sin cambios significativos |
| `Responsable` | `responsable` | GSI para consultas por tipo de actividad |

### Consideraciones de Migración

1. **Claves Primarias**: DynamoDB requiere definir explícitamente las claves
2. **Relaciones**: Las relaciones many-to-many se manejan con tablas separadas
3. **Consultas**: Se usan GSI (Global Secondary Index) para consultas eficientes
4. **Transacciones**: DynamoDB tiene limitaciones en transacciones complejas

## 📈 Optimización y Mejores Prácticas

### Diseño de Claves
- **Partition Key**: Distribuye datos uniformemente
- **Sort Key**: Permite consultas de rango eficientes
- **GSI**: Para patrones de consulta adicionales

### Patrones de Acceso Optimizados
1. **Por Espacio y Fecha**: `espacio-fecha-index` en tabla `reserva`
2. **Por Usuario**: `usuario-index` en tabla `reserva`
3. **Por Zona**: `zona-index` en tabla `espacio`

### Consideraciones de Costo
- **On-Demand**: Recomendado para cargas variables
- **Provisioned**: Para cargas predecibles y constantes
- **GSI**: Costo adicional, usar solo los necesarios

## 🔍 Monitoreo y Debugging

### Verificar Tablas Creadas
```python
from dynamodb_setup import DynamoDBSetup
setup = DynamoDBSetup()
setup.list_tables()
```

### Logs de CloudWatch (AWS)
- Métricas de lectura/escritura
- Throttling y errores
- Latencia de operaciones

### DynamoDB Local para Desarrollo
```bash
# Ver tablas en DynamoDB Local
aws dynamodb list-tables --endpoint-url http://localhost:8000

# Describir tabla específica
aws dynamodb describe-table --table-name reserva --endpoint-url http://localhost:8000
```

## 🚨 Solución de Problemas

### Error: "Table already exists"
```python
# El script maneja automáticamente tablas existentes
# Si necesitas recrear una tabla:
setup = DynamoDBSetup()
setup.delete_table('nombre_tabla')
setup.create_table('nombre_tabla')
```

### Error: "Credentials not configured"
```bash
# Verificar configuración AWS
aws sts get-caller-identity

# O configurar nuevamente
aws configure
```

### Error: "Endpoint not accessible"
```python
# Para DynamoDB local, verificar que esté ejecutándose
# Puerto por defecto: 8000
client = DynamoDBClient(endpoint_url='http://localhost:8000')
```

## 📚 Recursos Adicionales

- [Documentación oficial de DynamoDB](https://docs.aws.amazon.com/dynamodb/)
- [Mejores prácticas de DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Boto3 DynamoDB Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb.html)
- [DynamoDB Local Setup](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)

## 🤝 Soporte

Para problemas específicos:
1. Verificar logs de AWS CloudWatch
2. Revivar la configuración de credenciales
3. Validar estructura de datos con los ejemplos
4. Consultar la documentación oficial de AWS

---

**Nota**: Este sistema mantiene la misma funcionalidad del sistema Django original pero aprovecha las ventajas de escalabilidad y rendimiento de DynamoDB.
