# Dockerfile - Chaos Engineering Proxy
# Multi-stage build para optimización
FROM node:22-alpine AS builder

# Información del contenedor
LABEL maintainer="Equipo DevOps - Sistema Gestión Espacios"
LABEL description="Chaos Engineering Proxy para pruebas de resiliencia"
LABEL version="0.1.0"

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción solamente
RUN npm ci --only=production && npm cache clean --force

# Etapa de producción - Imagen mínima
FROM node:22-alpine AS production

# Instalar tini para manejo correcto de señales
RUN apk add --no-cache \
    tini \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S chaos -u 1001 -G nodejs

WORKDIR /app

# Copiar dependencias desde builder
COPY --from=builder --chown=chaos:nodejs /app/node_modules ./node_modules

# Copiar código de la aplicación
COPY --chown=chaos:nodejs package*.json ./
COPY --chown=chaos:nodejs index.js ./
COPY --chown=chaos:nodejs proxy.js ./

# Variables de entorno por defecto (se sobrescriben en runtime)
ENV NODE_ENV=production \
    CHAOS_PORT=9000

# Health check - verifica que el proxy responda
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9000', (r) => {process.exit(r.statusCode < 500 ? 0 : 1)})"

# Exponer puerto configurable
EXPOSE 9000

# Cambiar a usuario no-root
USER chaos

# Usar tini como entrypoint para manejo correcto de señales
ENTRYPOINT ["/sbin/tini", "--"]

# Comando de inicio
CMD ["node", "index.js"]
