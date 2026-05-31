# One-time setup: downloads Apache Maven into .tools/ (no global install needed)
# Usage: powershell -ExecutionPolicy Bypass -File setup-maven.ps1

$ErrorActionPreference = "Stop"
$mavenVersion = "3.9.9"
$toolsDir = Join-Path $PSScriptRoot ".tools"
$mavenHome = Join-Path $toolsDir "apache-maven-$mavenVersion"
$zipPath = Join-Path $toolsDir "maven.zip"

if (Test-Path (Join-Path $mavenHome "bin\mvn.cmd")) {
    Write-Host "Maven already installed at $mavenHome"
    exit 0
}

Write-Host "Downloading Apache Maven $mavenVersion..."
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
$url = "https://archive.apache.org/dist/maven/maven-3/$mavenVersion/binaries/apache-maven-$mavenVersion-bin.zip"
Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing

Write-Host "Extracting..."
Expand-Archive -Path $zipPath -DestinationPath $toolsDir -Force
Remove-Item $zipPath

Write-Host "Done. Maven installed at: $mavenHome"
Write-Host "Run auth service with: powershell -ExecutionPolicy Bypass -File run-auth.ps1"
