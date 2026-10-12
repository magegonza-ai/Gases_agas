$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$zip = Join-Path $root 'PROMINER-Portable-v2.1.0.zip'

Write-Host "== Construyendo $zip =="

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (Test-Path $zip) { Remove-Item $zip -Force }

$fs = [System.IO.File]::Open($zip, [System.IO.FileMode]::CreateNew)
$arch = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)

function Add-File([string]$srcFile, [string]$entryName) {
    if (-not (Test-Path -LiteralPath $srcFile)) { Write-Host "  FALTA: $srcFile"; return }
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $arch, $srcFile, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
}

function Add-Dir([string]$srcDir, [string]$prefix) {
    $resolved = (Resolve-Path -LiteralPath $srcDir).Path
    $files = Get-ChildItem -LiteralPath $resolved -Recurse -File -Force
    Write-Host ("  " + $prefix + ": " + $files.Count + " archivos")
    foreach ($f in $files) {
        $rel = $f.FullName.Substring($resolved.Length).TrimStart('\')
        $entry = ($prefix + '/' + $rel).Replace('\', '/')
        Add-File $f.FullName $entry
    }
}

Write-Host "[1/2] Archivos raiz..."
Add-File 'C:\Program Files\nodejs\node.exe' 'node.exe'
Add-File (Join-Path $root 'portable\iniciar.bat') 'iniciar.bat'
Add-File (Join-Path $root 'detener.bat') 'detener.bat'
Add-File (Join-Path $root 'limpiar.bat') 'limpiar.bat'
Add-File (Join-Path $root 'LEEME-PRIMERO.txt') 'LEEME-PRIMERO.txt'
Add-File (Join-Path $root 'schema_sqlite.sql') 'schema_sqlite.sql'

Write-Host "[2/2] Backend y frontend..."
Add-Dir (Join-Path $root 'backend') 'backend'
Add-Dir (Join-Path $root 'frontend\dist') 'frontend/dist'

$arch.Dispose()
$fs.Dispose()

$mb = [math]::Round((Get-Item $zip).Length / 1MB, 2)
Write-Host "== LISTO: $zip ($mb MB) =="
