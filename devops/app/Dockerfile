# Dockerfile - Sistema de Monitoreo DevOps
# Multi-stage build para optimizar el tamaño de la imagen
FROM node:22-alpine AS builder

# Información del contenedor
LABEL maintainer="Equipo DevOps - Sistema Gestión Espacios"
LABEL description="Sistema de Monitoreo DevOps para Gestión de Espacios"
LABEL version="2.0.0"

WORKDIR /app

# Copiar archivos de dependencias primero (para aprovechar Docker layer caching)
COPY package*.json ./

# Instalar dependencias de producción solamente
RUN npm ci --only=production && npm cache clean --force

# Etapa de producción - Imagen mínima
FROM node:22-alpine AS production

# Instalar tini para manejo correcto de señales y curl para health checks
RUN apk add --no-cache \
    tini \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S espacios -u 1001 -G nodejs

WORKDIR /app

# Copiar dependencias desde la etapa builder
COPY --from=builder --chown=espacios:nodejs /app/node_modules ./node_modules

# Copiar código de la aplicación
COPY --chown=espacios:nodejs package*.json ./
COPY --chown=espacios:nodejs server.js ./

# Crear directorio de logs con permisos correctos
RUN mkdir -p logs && chown -R espacios:nodejs logs

# Variables de entorno por defecto (se sobrescriben en runtime)
ENV NODE_ENV=production \
    PORT=3000 \
    API_BASE_URL=https://api.sistema-espacios.com \
    FRONTEND_URL=https://sistema-espacios.com

# Health check usando Node.js directamente (más eficiente que curl)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Exponer puerto
EXPOSE 3000

# Cambiar a usuario no-root
USER espacios

# Usar tini como entrypoint para manejo correcto de señales (SIGTERM, SIGINT)
ENTRYPOINT ["/sbin/tini", "--"]

# Comando de inicio
CMD ["node", "server.js"]
