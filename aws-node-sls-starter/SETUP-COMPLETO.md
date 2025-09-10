# 🚀 Guía de Despliegue Completo - Sistema de Gestión de Espacios

## ⚡ DESPLIEGUE DE UN SOLO COMANDO

**Una vez configurado, este sistema se despliega con:**
```bash
serverless deploy
```

---

## 📋 Setup Inicial (Solo Una Vez)

### 1. 🔧 Instalar AWS CLI

**Windows:**
```powershell
# Descargar e instalar desde: https://aws.amazon.com/cli/
# O usar Chocolatey:
choco install awscli

# O usar pip:
pip install awscli
```

**Verificar instalación:**
```bash
aws --version
```

### 2. 🔑 Configurar Credenciales AWS

```bash
aws configure
```

Necesitarás:
- **AWS Access Key ID**: Tu clave de acceso
- **AWS Secret Access Key**: Tu clave secreta  
- **Default region**: `us-east-1`
- **Default output**: `json`

### 3. 🛠️ Instalar Serverless Framework

```bash
npm install -g serverless
```

**Verificar instalación:**
```bash
serverless --version
```

### 4. 📦 Instalar Dependencias del Proyecto

```bash
cd aws-node-sls-starter
npm install
```

---

## ✅ Verificación Pre-Despliegue

**Ejecuta el script de verificación:**
```bash
node pre-deploy-check.js
```

Este script verifica:
- ✅ AWS Credentials configuradas
- ✅ Serverless Framework instalado
- ✅ Todos los archivos del proyecto
- ✅ Dependencies instaladas
- ✅ Configuración correcta

---

## 🚀 DESPLIEGUE AUTOMÁTICO

### Opción 1: Despliegue con Verificación (Recomendado)
```bash
npm run deploy
```

### Opción 2: Despliegue Directo
```bash
serverless deploy
```

### Opción 3: Despliegue Rápido (Sin verificaciones)
```bash
npm run deploy:quick
```

---

## 📊 Lo Que Se Despliega Automáticamente

| Servicio AWS | Cantidad | Descripción |
|--------------|----------|-------------|
| **Lambda Functions** | 50 | APIs completas del sistema |
| **DynamoDB Table** | 1 | Base de datos principal |
| **Cognito User Pool** | 1 | Autenticación y autorización |
| **SQS Queue** | 1 | Procesamiento asíncrono |
| **API Gateway** | 1 | Endpoints HTTP REST |
| **IAM Roles** | 5+ | Permisos y seguridad |
| **CloudWatch Logs** | Auto | Monitoreo y logs |

---

## 🎯 Endpoints Desplegados

Una vez desplegado, tendrás URLs como:

```
✅ Autenticación:
POST https://[API-ID].execute-api.us-east-1.amazonaws.com/dev/api/auth/login
POST https://[API-ID].execute-api.us-east-1.amazonaws.com/dev/api/auth/register

✅ Gestión de Espacios:
GET  https://[API-ID].execute-api.us-east-1.amazonaws.com/dev/api/espacios
POST https://[API-ID].execute-api.us-east-1.amazonaws.com/dev/api/espacios

✅ Gestión de Recursos:
GET  https://[API-ID].execute-api.us-east-1.amazonaws.com/dev/api/recursos
POST https://[API-ID].execute-api.us-east-1.amazonaws.com/dev/api/recursos

✅ Gestión de Responsables:
GET  https://[API-ID].execute-api.us-east-1.amazonaws.com/dev/api/responsables
POST https://[API-ID].execute-api.us-east-1.amazonaws.com/dev/api/responsables

✅ Gestión de Zonas:
GET  https://[API-ID].execute-api.us-east-1.amazonaws.com/dev/api/zonas
POST https://[API-ID].execute-api.us-east-1.amazonaws.com/dev/api/zonas

✅ Health Checks:
GET  https://[API-ID].execute-api.us-east-1.amazonaws.com/dev/api/health/resilience
GET  https://[API-ID].execute-api.us-east-1.amazonaws.com/dev/api/health/bulkhead
```

---

## 🧪 Verificación Post-Despliegue

### 1. Ver información del stack:
```bash
serverless info
```

### 2. Test de salud del sistema:
```bash
curl https://[API-URL]/api/health/resilience
```

### 3. Ver logs en tiempo real:
```bash
serverless logs -f queueWorker -t
```

---

## 💰 Costos Estimados

| Servicio | Nivel Gratuito | Costo Mensual Estimado |
|----------|----------------|------------------------|
| Lambda | 1M requests/month | $0 - $5 |
| DynamoDB | 25 GB storage | $0 - $3 |
| Cognito | 50,000 MAU | $0 - $2 |
| API Gateway | 1M calls | $0 - $4 |
| SQS | 1M requests | $0 - $1 |
| **TOTAL** | **Mayormente Gratuito** | **$0 - $15** |

---

## 🔧 Comandos Útiles

```bash
# Información detallada del despliegue
serverless info --verbose

# Desplegar en producción
serverless deploy --stage prod

# Eliminar todo el stack
serverless remove

# Ver logs de una función específica
serverless logs -f [function-name]

# Invocar una función directamente
serverless invoke -f [function-name]
```

---

## 🌍 Casos de Uso del Sistema

### 🏫 **Escuelas y Universidades**
- Gestión de aulas y laboratorios
- Reserva de espacios educativos
- Control de recursos académicos
- Horarios y asignaciones

### 🚗 **Estacionamientos**
- Control de espacios de parking
- Sistema de reservas vehiculares
- Gestión de accesos y tarifas
- Monitoreo en tiempo real

### 🏢 **Oficinas Corporativas**
- Salas de reunión y conferencias
- Espacios de trabajo flexible
- Recursos compartidos (proyectores, etc.)
- Gestión de capacidad

### 🎪 **Centros de Eventos**
- Espacios para eventos y conferencias
- Gestión de recursos técnicos
- Control de capacidad y seguridad
- Programación de eventos

---

## 🔒 Seguridad Incluida

- ✅ **Cognito JWT**: Autenticación segura
- ✅ **IAM Roles**: Permisos mínimos necesarios
- ✅ **HTTPS**: Cifrado en tránsito
- ✅ **DynamoDB Encryption**: Cifrado en reposo
- ✅ **CloudWatch**: Auditoría y monitoreo

---

## 📞 Soporte y Monitoreo

- **CloudWatch Logs**: Logs detallados de todas las funciones
- **CloudWatch Metrics**: Métricas de rendimiento en tiempo real
- **Health Checks**: Endpoints de verificación automática
- **Patrones de Resiliencia**: Retry, Circuit Breaker, Bulkhead

---

## ⚡ Resultado Final

**Con un solo comando `serverless deploy`, obtienes:**

✅ **Sistema Enterprise-Grade Completo**  
✅ **Arquitectura Serverless Escalable**  
✅ **50 APIs REST Funcionando**  
✅ **Autenticación Segura Integrada**  
✅ **Base de Datos NoSQL Configurada**  
✅ **Patrones de Resiliencia Activos**  
✅ **Monitoreo y Logs Automáticos**  
✅ **Costo-Eficiente Pay-Per-Use**  

**¡Listo para gestionar espacios en cualquier industria!** 🚀
