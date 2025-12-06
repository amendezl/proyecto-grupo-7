Param()

$repoRoot = (Get-Location).Path
$cloudfront = 'https://d3tse7z0pwpydh.cloudfront.net'
$patterns = @(
  'http://sistema-gestion-espacios-frontend-dev.s3-website-us-east-1.amazonaws.com',
  'https://sistema-gestion-espacios-frontend-dev.s3-website-us-east-1.amazonaws.com',
  'sistema-gestion-espacios-frontend-dev.s3.amazonaws.com'
)

$includeDirs = @('.', 'docs', 'scripts')
$excludeDirs = @('.terraform', '.serverless', '.git')

$backupDir = Join-Path $repoRoot ('scripts\replace-backups-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$changed = @()

Write-Host "Searching and replacing S3 website references with CloudFront: $cloudfront"

foreach ($dir in $includeDirs) {
  $path = Join-Path $repoRoot $dir
  if (-not (Test-Path $path)) { continue }
  $files = Get-ChildItem -Path $path -Recurse -File -Include *.md,*.txt,*.yml,*.yaml,*.sh,*.ps1,*.html,*.json -ErrorAction SilentlyContinue
  foreach ($f in $files) {
    if ($excludeDirs | ForEach-Object { $f.FullName -like "*\$_\*" } | Where-Object { $_ }) { continue }
    $content = Get-Content -Raw -LiteralPath $f.FullName -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    $new = $content
    foreach ($p in $patterns) { $new = $new -replace [regex]::Escape($p), $cloudfront }
    if ($new -ne $content) {
      $rel = $f.FullName.Substring($repoRoot.Length).TrimStart('\')
      $bak = Join-Path $backupDir ($rel -replace '[\\/:]','_') + '.bak'
      New-Item -ItemType Directory -Path (Split-Path $bak) -Force | Out-Null
      Set-Content -Path $bak -Value $content -Encoding utf8
      Set-Content -Path $f.FullName -Value $new -Encoding utf8
      $changed += $f.FullName
      Write-Host "Patched: $rel"
    }
  }
}

if ($changed.Count -eq 0) { Write-Host 'No occurrences found.' } else { Write-Host "Modified files:`n" + ($changed -join "`n") ; Write-Host "Backups: $backupDir" }
<#
Reemplaza ocurrencias de la URL pública del S3 Website por el dominio CloudFront.

Uso (desde la raíz del repo):
  powershell -ExecutionPolicy Bypass -File .\scripts\replace-s3-with-cloudfront.ps1

El script solo modifica archivos en `docs/`, `scripts/`, la raiz (`*.md`, `*.yaml`, `*.yml`, `*.sh`, `*.ps1`, `*.txt`) y evita carpetas generadas como `.terraform`, `.serverless` y archivos de state (`*.tfstate`).
Hace un backup por archivo modificado en `scripts/replace-backups/`.
#>

Param()

$repoRoot = (Get-Location).Path

$cloudfront = 'https://d3tse7z0pwpydh.cloudfront.net'
$bucketWebsite1 = 'http://sistema-gestion-espacios-frontend-dev.s3-website-us-east-1.amazonaws.com'
$bucketWebsite2 = 'https://sistema-gestion-espacios-frontend-dev.s3-website-us-east-1.amazonaws.com'
$bucketRest = 'sistema-gestion-espacios-frontend-dev.s3.amazonaws.com'

$includeDirs = @('.', 'docs', 'scripts')
$excludeDirs = @('.terraform', '.serverless', '.git')

$backupDir = Join-Path $repoRoot 'scripts\replace-backups\' + (Get-Date -Format 'yyyyMMdd-HHmmss')
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$changed = @()

Write-Host "Replacing S3 website URLs with CloudFront domain: $cloudfront"

foreach ($dir in $includeDirs) {
  $fullDir = Join-Path $repoRoot $dir
  if (-not (Test-Path $fullDir)) { continue }
  Get-ChildItem -Path $fullDir -Recurse -File -Include *.md,*.txt,*.yml,*.yaml,*.sh,*.ps1,*.html,*.json | Where-Object {
    foreach ($ex in $excludeDirs) { if ($_.FullName -like "*\\$ex\\*") { return $false } }
    return $true
  } | ForEach-Object {
    $content = Get-Content -Raw -LiteralPath $_.FullName -ErrorAction SilentlyContinue
    if (-not $content) { return }
    $new = $content -replace [regex]::Escape($bucketWebsite1), $cloudfront
    $new = $new -replace [regex]::Escape($bucketWebsite2), $cloudfront
    $new = $new -replace [regex]::Escape($bucketRest), $cloudfront
    <#
    Reemplaza ocurrencias de la URL pública del S3 Website por el dominio CloudFront.

    Uso (desde la raíz del repo):
      powershell -ExecutionPolicy Bypass -File .\scripts\replace-s3-with-cloudfront.ps1

    El script solo modifica archivos en `docs/`, `scripts/`, la raiz (`*.md`, `*.yaml`, `*.yml`, `*.sh`, `*.ps1`, `*.txt`) y evita carpetas generadas como `.terraform`, `.serverless` y archivos de state (`*.tfstate`).
    Hace un backup por archivo modificado en `scripts/replace-backups/`.
    #>

    Param()

    $repoRoot = (Get-Location).Path

    $cloudfront = 'https://d3tse7z0pwpydh.cloudfront.net'
    $bucketWebsite1 = 'http://sistema-gestion-espacios-frontend-dev.s3-website-us-east-1.amazonaws.com'
    $bucketWebsite2 = 'https://sistema-gestion-espacios-frontend-dev.s3-website-us-east-1.amazonaws.com'
    $bucketRest = 'sistema-gestion-espacios-frontend-dev.s3.amazonaws.com'

    $includeDirs = @('.', 'docs', 'scripts')
    $excludeDirs = @('.terraform', '.serverless', '.git')

    $backupDir = Join-Path $repoRoot ("scripts\\replace-backups\\" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    $changed = @()

    Write-Host "Replacing S3 website URLs with CloudFront domain: $cloudfront"

    foreach ($dir in $includeDirs) {
      $fullDir = Join-Path $repoRoot $dir
      if (-not (Test-Path $fullDir)) { continue }
      Get-ChildItem -Path $fullDir -Recurse -File -Include *.md,*.txt,*.yml,*.yaml,*.sh,*.ps1,*.html,*.json | Where-Object {
        foreach ($ex in $excludeDirs) { if ($_.FullName -like "*\\$ex\\*") { return $false } }
        return $true
      } | ForEach-Object {
        $content = Get-Content -Raw -LiteralPath $_.FullName -ErrorAction SilentlyContinue
        if (-not $content) { return }
        $new = $content -replace [regex]::Escape($bucketWebsite1), $cloudfront
        $new = $new -replace [regex]::Escape($bucketWebsite2), $cloudfront
        $new = $new -replace [regex]::Escape($bucketRest), $cloudfront
        if ($new -ne $content) {
          $rel = $_.FullName.Substring($repoRoot.Length).TrimStart('\')
          $backupPath = Join-Path $backupDir ($rel -replace '[\\/:]','_') + '.bak'
          New-Item -ItemType Directory -Path (Split-Path $backupPath) -Force | Out-Null
          Set-Content -Path $backupPath -Value $content -Encoding utf8
          Set-Content -Path $_.FullName -Value $new -Encoding utf8
          $changed += $_.FullName
          Write-Host "Patched: $rel"
        }
      }
    }

    if ($changed.Count -eq 0) {
      Write-Host "No matching occurrences found. No files modified."
    } else {
      Write-Host "Modified files:`n" + ($changed -join "`n")
      Write-Host "Backups saved to: $backupDir"
    }
