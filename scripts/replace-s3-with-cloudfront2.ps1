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
    if ($excludeDirs | ForEach-Object { $f.FullName -like "*\\$_\\*" } | Where-Object { $_ }) { continue }
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
