Write-Host "Limpiando versiones antiguas de Lambda..." -ForegroundColor Cyan

$functions = aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `sistema-gestion-espacios-dev`)].FunctionName' --output json | ConvertFrom-Json

$totalDeleted = 0

foreach ($func in $functions) {
    Write-Host "Procesando: $func" -ForegroundColor Yellow
    
    $versions = aws lambda list-versions-by-function --function-name $func --query 'Versions[?Version!=`$LATEST`].Version' --output json | ConvertFrom-Json
    
    if ($versions.Count -eq 0) {
        Write-Host "  Sin versiones antiguas" -ForegroundColor Gray
        continue
    }
    
    Write-Host "  Encontradas $($versions.Count) versiones antiguas" -ForegroundColor White
    
    $versionsToDelete = $versions | Select-Object -SkipLast 2
    
    foreach ($version in $versionsToDelete) {
        aws lambda delete-function --function-name $func --qualifier $version 2>$null
        if ($?) {
            $totalDeleted++
            Write-Host "    Eliminada version $version" -ForegroundColor Green
        }
    }
}

Write-Host "Limpieza completada: $totalDeleted versiones eliminadas" -ForegroundColor Green
