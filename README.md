# Sistema de Gestión de Espacios - Guía de Despliegue

**Proyecto Arquitectura de Sistemas 2025-2**

**Autores**: Benjamin Bennett Ramírez, Marcial Ibáñez Saenz, Antonio Méndez Leiva, Tomás Rodríguez Álvarez

**Docente**: Mauricio Alex Vásquez Duque

## 🔧 Requisitos Previos

- **AWS Academy Account** con acceso a voclabs
- **Instancia EC2 Ubuntu** (recomendado t2.medium o superior)
- **Credenciales de AWS Academy** (Access Key ID y Secret Access Key)
- **Puerto 22 (SSH)** habilitado en el Security Group

---

## 🖥️ Configuración de la Instancia EC2

### 1. Conectar a la instancia

```bash
ssh -i tu-llave.pem ubuntu@tu-ip-publica
```

---

## 📦 Instalación de Dependencias

### 1. Actualizar el sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar Node.js 22.x

```bash
# Agregar repositorio de Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Instalar Node.js y herramientas básicas
sudo apt-get install -y nodejs git unzip curl

# Verificar instalación
node --version  # Debe mostrar v22.x.x
npm --version   # Debe mostrar 10.x.x o superior
```

### 3. Instalar AWS CLI v2

```bash
# Descargar e instalar AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verificar instalación
aws --version  # Debe mostrar aws-cli/2.x.x

# Limpiar archivos temporales
rm -rf awscliv2.zip aws/
```

### 4. Instalar Serverless Framework

```bash
# Instalar Serverless Framework globalmente con sudo
sudo npm install -g serverless@4.22.0

# Verificar instalación
serverless --version  # Debe mostrar Framework Core: 4.22.0
```

---

## 🔐 Configuración de AWS CLI

### 1. Configurar credenciales de AWS Academy

```bash
aws configure
```

Ingresar los siguientes valores:
- **AWS Access Key ID**: `[Tu Access Key de AWS Academy]`
- **AWS Secret Access Key**: `[Tu Secret Key de AWS Academy]`
- **Default region name**: `us-east-1`
- **Default output format**: `json`

### 2. Verificar configuración

```bash
# Verificar que las credenciales funcionen
aws sts get-caller-identity
```

---

## 📂 Clonación y Preparación del Proyecto

### 1. Clonar el repositorio

```bash
cd ~
git clone https://github.com/amendezl/proyecto-grupo-7.git
cd proyecto-grupo-7
```

### 2. Instalar dependencias del backend

```bash
cd proyecto
npm install
```

### 3. Instalar dependencias del frontend

```bash
cd ../frontend
npm install
cd ..
```

---

## 🚀 Despliegue del Sistema

### 1. Crear el bucket de deployment (solo primera vez)

```bash
# Crear bucket para el despliegue de Serverless Framework
aws s3 mb s3://sistema-gestion-espacios-dev-deployment --region us-east-1
```

### 2. Desplegar el stack completo

```bash
cd ~/proyecto-grupo-7/proyecto
npx serverless deploy --stage dev
```

**⏱️ Tiempo estimado**: 4-6 minutos

El despliegue ejecuta automáticamente estos pasos (mediante hooks configurados en `serverless.yml`):

1. **Preparación del Frontend**
   - `npm ci` para instalar dependencias
   - Genera `.env.production.local` con URLs de las APIs desde CloudFormation outputs
   
2. **Compilación del Frontend**
   - `npm run build` - Compila Next.js 15.5.3 en modo producción
   - `npm run export` - Genera exportación estática en `out/`

3. **Despliegue del Backend**
   - ✅ **35 funciones Lambda** (Node.js 22.x, ~10 MB cada una)
   - ✅ **DynamoDB** - Tabla principal con streams
   - ✅ **AWS Cognito** - User Pool y App Client
   - ✅ **API Gateway HTTP** - APIs RESTful
   - ✅ **API Gateway WebSocket** - Comunicación en tiempo real
   - ✅ **SQS + SNS** - Colas y notificaciones
   
4. **Subida del Frontend a S3**
   - `serverless client deploy` - Plugin serverless-finch sube archivos estáticos
   - Configura bucket como website hosting
   - Aplica ACL `public-read` a todos los objetos

5. **Población de Base de Datos**
   - Script `seed-dynamodb.js` inserta **340 registros de prueba**
   - Incluye: usuarios, espacios, reservas, responsables, zonas

6. **Tests de Chaos Engineering**
   - Smoke tests en `chaos-engineering/`
   - Verifica resiliencia de las APIs

---

## ✅ Verificación del Despliegue

### 1. Verificar el stack de CloudFormation

```bash
aws cloudformation describe-stacks --stack-name sistema-gestion-espacios-dev
```

### 2. Probar el health check

```bash
# Reemplaza [api-id] con el ID de tu API Gateway
curl https://[api-id].execute-api.us-east-1.amazonaws.com/health
```

### 3. Ver logs de una función Lambda

```bash
cd ~/proyecto-grupo-7/proyecto
npx serverless logs -f healthCheck --stage dev
```

## 🔄 Redespliegue y Actualizaciones

### 1. Actualizar código

```bash
cd ~/proyecto-grupo-7
git pull origin main
```

### 2. Redesplegar solo backend

```bash
cd ~/proyecto-grupo-7/proyecto
npx serverless deploy --stage dev
```

**Nota**: Esto también ejecutará los hooks post-deploy (frontend build, seeding, tests).

### 3. Redesplegar solo frontend (sin backend)

```bash
# Opción 1: Usando serverless-finch
cd ~/proyecto-grupo-7/proyecto
npx serverless client deploy --no-confirm

# Opción 2: Compilar y subir manualmente
cd ~/proyecto-grupo-7/frontend
npm run build
cd ../proyecto
aws s3 sync ../frontend/out s3://sistema-gestion-espacios-frontend-dev --acl public-read --delete
```

### 4. Solo sembrar base de datos

```bash
cd ~/proyecto-grupo-7/proyecto
DYNAMODB_TABLE=sistema-gestion-espacios-dev-main node scripts/seed-dynamodb.js --stage dev --yes
```

---

## 🗑️ Eliminar el Despliegue

Para eliminar completamente el stack y todos los recursos:

```bash
cd ~/proyecto-grupo-7/proyecto
npx serverless remove --stage dev
```

**⚠️ ADVERTENCIA**: Esto eliminará:
- Todas las funciones Lambda
- La tabla DynamoDB (y todos los datos)
- El bucket S3 del frontend
- El User Pool de Cognito
- Todas las APIs

---

## 🐛 Solución de Problemas

### Error: "No configuration file found"

```bash
# Asegúrate de estar en el directorio correcto
cd ~/proyecto-grupo-7/proyecto
```

### Error: "EACCES: permission denied"

```bash
# Usar sudo para instalaciones globales
sudo npm install -g serverless@4.22.0
```

### Error: "Credentials expired"

```bash
# Reconfigurar AWS CLI con nuevas credenciales de AWS Academy
aws configure
```

### Frontend muestra 403 Forbidden

El frontend está configurado con `serverless-finch` que aplica automáticamente ACL `public-read`. Si aún ves 403:

```bash
# Verificar que el bucket existe
aws s3 ls s3://sistema-gestion-espacios-frontend-dev/

# Resubir frontend con permisos públicos explícitos
cd ~/proyecto-grupo-7/proyecto
npx serverless client deploy --no-confirm

# O manualmente con AWS CLI
aws s3 sync ../frontend/out s3://sistema-gestion-espacios-frontend-dev --acl public-read --delete
```

### Error: "The CloudFormation template is invalid"

```bash
# Limpiar caché de Serverless
cd ~/proyecto-grupo-7/proyecto
rm -rf .serverless

# Volver a desplegar
npx serverless deploy --stage dev
```

### Despliegue se queda colgado o toma mucho tiempo

- El despliegue normal toma **4-6 minutos**
- La primera vez puede tardar más (creación de recursos)
- Si pasa de 10 minutos, cancela (Ctrl+C) y vuelve a intentar

---

## 📝 Notas Importantes

### AWS Academy Voclabs
- **Credenciales**: Expiran después de **4 horas**. Reconfigura con `aws configure` cuando veas errores de autenticación.
- **IAM Role**: El sistema usa `LabRole` existente (ARN: `arn:aws:iam::975050051149:role/LabRole`)
- **Restricciones**: No se pueden crear nuevos roles IAM ni políticas de bucket (por eso usamos ACLs)

### Configuración Específica
- **Región**: Siempre usar `us-east-1` para compatibilidad con AWS Academy
- **Node.js**: Requiere versión 22.x o superior (compatible con Lambda nodejs22.x runtime)
- **Serverless Framework**: Versión 4.22.0 específica para compatibilidad

### Deployment Bucket
- Nombre: `sistema-gestion-espacios-dev-deployment`
- Se crea automáticamente en el primer despliegue
- Almacena los artefactos de CloudFormation y el código de las funciones Lambda

### Frontend
- Build output: `frontend/out/` (18 páginas estáticas)
- Bucket S3: `sistema-gestion-espacios-frontend-dev`
- ACL: `public-read` aplicada por serverless-finch
- Tamaño: ~45MB de archivos JavaScript/CSS/HTML

### Costos Estimados
- **Desarrollo**: ~$0-2/día (dentro de capa gratuita de AWS)
- **Lambda**: 1M requests/mes gratis, luego $0.20/1M requests
- **DynamoDB**: 25GB storage gratis, luego $0.25/GB/mes
- **S3**: 5GB storage gratis, luego $0.023/GB/mes
- **Limpieza**: Ejecuta `serverless remove` al finalizar para evitar costos

### Base de Datos
- Tabla principal: `sistema-gestion-espacios-dev-main`
- Datos de prueba: 340 registros insertados automáticamente
- Incluye: 100 usuarios, 80 espacios, 100 reservas, 30 responsables, 30 zonas

---

## 🎯 Arquitectura del Sistema

☁️ **Arquitectura 100% Serverless**

### **🎪 Backend Serverless (AWS)**
- **Runtime**: Node.js 22.x en AWS Lambda
- **Database**: DynamoDB serverless con streams
- **API**: AWS API Gateway (HTTP + WebSocket)
- **Auth**: AWS Cognito User Pool + JWT
- **Mensajes**: Amazon SQS (colas) + Amazon SNS (notificaciones)
- **Monitoring**: CloudWatch Logs + Métricas personalizadas
- **Deployment**: Serverless Framework 4.22.0 con split-stacks
- **Escalado**: Automático e infinito (0 a millones)
- **Costo**: $0 cuando no se usa (pay-per-use)

### **🌐 Frontend Serverless (AWS S3)**
- **Storage**: AWS S3 con hosting web estático
- **Framework**: Next.js 15.5.3 con exportación estática
- **UI**: React 19.1.0 + TailwindCSS 3.4.0
- **Despliegue**: Automatizado con serverless-finch plugin
- **ACL**: `public-read` para acceso público
- **CDN**: Compatible con CloudFront (deshabilitado en voclabs)
- **Acceso**: URL pública del bucket S3

### **🎯 Beneficios Serverless Completo**
- ✅ **Costo**: Solo pagas por requests reales
- ✅ **Escalado**: De 0 a millones automáticamente  
- ✅ **Mantenimiento**: Cero servidores que mantener
- ✅ **Performance**: Baja latencia global
- ✅ **Seguridad**: Managed services enterprise
- ✅ **Deploy**: Git push = deploy automático

---

## 📚 Recursos Adicionales

- **Documentación de Serverless Framework**: https://www.serverless.com/framework/docs/
- **AWS Lambda**: https://aws.amazon.com/lambda/
- **AWS DynamoDB**: https://aws.amazon.com/dynamodb/
- **AWS Cognito**: https://aws.amazon.com/cognito/
- **Next.js**: https://nextjs.org/

---

## 👥 Soporte

Para preguntas o problemas:
1. Consultar la documentación oficial de AWS y Serverless Framework
2. Contactar al equipo de desarrollo