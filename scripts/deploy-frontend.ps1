# Script para construir y desplegar el frontend a S3 y CloudFront
# Uso: .\scripts\deploy-frontend.ps1

Write-Host "=== Iniciando despliegue del frontend ===" -ForegroundColor Cyan

# 1. Navegar al directorio del frontend
Write-Host "`n[1/4] Navegando al directorio frontend..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\..\frontend"

# 2. Construir la aplicación
Write-Host "`n[2/4] Construyendo la aplicación Next.js..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Error en el build. Abortando despliegue." -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Build completado exitosamente" -ForegroundColor Green

# 3. Sincronizar con S3
Write-Host "`n[3/4] Sincronizando archivos con S3..." -ForegroundColor Yellow
aws s3 sync out/ s3://sistema-gestion-espacios-frontend-dev --profile Admin --delete

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Error al sincronizar con S3. Abortando despliegue." -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Archivos sincronizados con S3" -ForegroundColor Green

# 4. Invalidar caché de CloudFront
Write-Host "`n[4/4] Invalidando caché de CloudFront..." -ForegroundColor Yellow
$invalidation = aws cloudfront create-invalidation --distribution-id EX85UQ1KKM9BI --paths "/*" --profile Admin | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Error al invalidar CloudFront." -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Invalidación de CloudFront creada: $($invalidation.Invalidation.Id)" -ForegroundColor Green

# Resumen final
Write-Host "`n=== Despliegue completado exitosamente ===" -ForegroundColor Cyan
Write-Host "URL: https://d14088jtgw7s5t.cloudfront.net" -ForegroundColor Green
Write-Host "CloudFront Distribution: EX85UQ1KKM9BI" -ForegroundColor Gray
Write-Host "Invalidation ID: $($invalidation.Invalidation.Id)" -ForegroundColor Gray
Write-Host "`nLa invalidación puede tardar unos minutos en completarse." -ForegroundColor Yellow
