# Start auth-service (downloads Maven first if needed)
$ErrorActionPreference = "Stop"
$mavenVersion = "3.9.9"
$mavenHome = Join-Path $PSScriptRoot ".tools\apache-maven-$mavenVersion"
$mvn = Join-Path $mavenHome "bin\mvn.cmd"

if (-not (Test-Path $mvn)) {
    Write-Host "Maven not found. Running setup..."
    & (Join-Path $PSScriptRoot "setup-maven.ps1")
}

Set-Location $PSScriptRoot

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

if (-not $env:JWT_SECRET) {
    $env:JWT_SECRET = "local-dev-only-change-in-production"
    Write-Host "Using default JWT_SECRET for local dev. Copy .env.example to .env for your own secret."
}

& $mvn spring-boot:run
