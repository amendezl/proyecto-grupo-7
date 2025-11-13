# ========================================
# TERRAFORM VARIABLES - SISTEMA DE GESTIÓN DE ESPACIOS
# ========================================

# Ejemplo de terraform.tfvars para personalizar el deployment
# Copiar este archivo como terraform.tfvars y modificar según necesidades

# Configuración AWS
aws_region  = "us-east-1"
environment = "prod"

# Configuración de la aplicación
app_name                = "sistema-gestion-espacios"
monitoring_service_name = "espacios-monitor"

# Configuración específica por entorno
# Para desarrollo
# environment = "dev"
# aws_region = "us-east-1"

# Para staging  
# environment = "staging"
# aws_region = "us-east-1"

# Para producción
# environment = "prod" 
# aws_region = "us-east-1"