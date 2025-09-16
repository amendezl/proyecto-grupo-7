# Sistema de Gestión de Espacios - Enterprise Grade

**Proyecto Arquitectura de Sistemas 2025-2**

**Autores**: Benjamin Bennett Ramírez, Antonio Méndez Leiva y Tomás Rodríguez Álvarez  
**Docente**: Mauricio Alex Vásquez Duque

## 🎯 Descripción

Sistema empresarial de gestión de espacios desarrollado con **Node.js**, **AWS Serverless** y **Arquitectura Enterprise**. Cumple con todos los requisitos de personalización, generalización, arquitectura desacoplada, orientación a componentes, infraestructura en la nube, seguridad cloud e integración empresarial.

## 🚀 Tecnologías

- **Runtime**: Node.js 20
- **Cloud**: AWS Lambda + API Gateway + DynamoDB + Cognito + SQS + SNS  
- **Framework**: Serverless Framework v3
- **Arquitectura**: Microservicios Serverless
- **Autenticación**: AWS Cognito JWT
- **Resiliencia**: Retry + Circuit Breaker + Bulkhead Patterns

## 📁 Estructura del Proyecto

```
proyecto-grupo-7/
├── aws-node-sls-starter/    # 🎯 PROYECTO PRINCIPAL (Node.js Serverless)
│   ├── src/                 # Código fuente
│   ├── serverless.yml      # Configuración AWS
│   ├── package.json        # Dependencias Node.js
│   └── README.md           # Documentación completa
├── LICENSE                 # Licencia del proyecto
└── README.md              # Este archivo
```

## 🎯 Para el Profesor

**Proyecto Principal**: `./aws-node-sls-starter/`

**Deploy único**: 
```bash
cd aws-node-sls-starter
npm install
npm run deploy
```

**Características Enterprise:**
- ✅ 58 Lambda Functions (100% Node.js)
- ✅ 58 APIs REST funcionales  
- ✅ Arquitectura desacoplada y orientada a componentes
- ✅ Infraestructura 100% cloud (AWS)
- ✅ Seguridad enterprise (IAM + JWT + RBAC)
- ✅ Patrones de resiliencia integrados
- ✅ Sistema personalizable y generalista
- ✅ Single-command deployment

Ver documentación completa en `./aws-node-sls-starter/README.md`
