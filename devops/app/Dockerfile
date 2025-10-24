# Dockerfile
# Multi-stage build para optimizar el tamaño de la imagen
FROM node:20-alpine AS builder

# Información del contenedor
LABEL maintainer="Equipo DevOps - Sistema Gestión Espacios"
LABEL description="Sistema de Monitoreo DevOps para Gestión de Espacios"
LABEL version="2.0.0"

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copiar archivos de dependencias primero (para aprovechar Docker layer caching)
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Etapa de producción
FROM node:20-alpine AS production

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S espacios -u 1001 -G nodejs

WORKDIR /app

# Copiar dependencias y código desde la etapa builder
COPY --from=builder --chown=espacios:nodejs /app/node_modules ./node_modules
COPY --chown=espacios:nodejs . .

# Crear directorio de logs
RUN mkdir -p logs && chown -R espacios:nodejs logs

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000
ENV API_BASE_URL=https://api.sistema-espacios.com
ENV FRONTEND_URL=https://sistema-espacios.com

# Health check nativo de Docker
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Exponer puerto
EXPOSE 3000

# Cambiar a usuario no-root
USER espacios

# Comando de inicio
CMD ["npm", "start"]
