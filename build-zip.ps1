# build-zip.ps1 — erzeugt die self-contained ZIP-Variante fuer den SAC-Upload.
# KalenderHCM hat keine externen Assets (CSS ist ins JS inlined), daher wird das
# Widget-JS nur nach dist/ kopiert und mit dem Icon in eine ZIP (< 5 MB) gepackt.
#
#   Aufruf:  powershell -ExecutionPolicy Bypass -File build-zip.ps1

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null

# 1) Self-contained Widget-JS (CSS ist bereits inline) nach dist kopieren
$srcJs = Join-Path $root 'src\kalender-hcm.js'
$outJs = Join-Path $dist 'kalender-hcm-widget.js'
Copy-Item $srcJs $outJs -Force

# 2) Icon mitkopieren
Copy-Item (Join-Path $root 'icon.png') (Join-Path $dist 'icon.png') -Force

# 3) ZIP packen (JS + Icon) — die zip-Manifest-JSON wird NICHT eingepackt,
#    die laedt man separat in SAC hoch.
$zip = Join-Path $dist 'kalender-hcm.zip'
Compress-Archive -Path $outJs, (Join-Path $dist 'icon.png') -DestinationPath $zip -CompressionLevel Optimal -Force

$zipKb = [math]::Round((Get-Item $zip).Length / 1kb)
Write-Output "OK  widget JS: $([math]::Round((Get-Item $outJs).Length/1kb)) KB"
Write-Output "OK  ZIP:       $zipKb KB  (Limit 5120 KB)"
Write-Output "Upload-Reihenfolge in SAC: 1) dist\kalender-hcm-zip.json  2) dist\kalender-hcm.zip"
if ($zipKb -gt 5120) { Write-Warning 'ZIP ueberschreitet 5 MB!' }
