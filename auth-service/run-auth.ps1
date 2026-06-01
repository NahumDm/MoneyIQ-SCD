# Start auth-service (downloads Maven first if needed)
$ErrorActionPreference = "Stop"
$mavenVersion = "3.9.9"
$mavenHome = Join-Path $PSScriptRoot ".tools\apache-maven-$mavenVersion"
$mvn = Join-Path $mavenHome "bin\mvn.cmd"

function Get-JavaMajorVersion {
    param([string]$JavaExe)
    # java -version writes to stderr; with Stop, PowerShell treats that as a terminating error
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $lines = & $JavaExe -version 2>&1 | ForEach-Object { $_.ToString() }
    } finally {
        $ErrorActionPreference = $prev
    }
    $text = $lines -join " "
    if ($text -match 'version "1\.(\d+)') { return [int]$Matches[1] }   # 1.8 -> 8
    if ($text -match 'version "(\d+)')     { return [int]$Matches[1] }   # 21, 17, ...
    return 0
}

function Normalize-JavaHome {
    param([string]$JdkRoot)
    if (-not $JdkRoot) { return $null }
    $JdkRoot = $JdkRoot.Trim().TrimEnd('\', '/')
    if ($JdkRoot -match '\\bin$|/bin$') {
        $JdkRoot = Split-Path $JdkRoot -Parent
    }
    return $JdkRoot
}

function Resolve-JavaHome {
    $found = @()

    # 1) Known JDK 21 install locations (most reliable on this machine)
    $candidates = @(
        "C:\Program Files\Microsoft\jdk-21*",
        "C:\Program Files\Java\jdk-21*",
        "C:\Program Files\Java\jdk-17*",
        "C:\Program Files\Eclipse Adoptium\jdk-21*",
        "C:\Program Files\Eclipse Adoptium\jdk-17*"
    )
    foreach ($pattern in $candidates) {
        Get-ChildItem $pattern -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { $found += $_.FullName }
    }

    # 2) JAVA_HOME from environment (User / Machine / Process)
    foreach ($name in @("JAVA_HOME")) {
        $raw = [Environment]::GetEnvironmentVariable($name, "Process")
        if (-not $raw) { $raw = [Environment]::GetEnvironmentVariable($name, "User") }
        if (-not $raw) { $raw = [Environment]::GetEnvironmentVariable($name, "Machine") }
        $norm = Normalize-JavaHome $raw
        if ($norm) { $found = @($norm) + $found }
    }

    $seen = @{}
    foreach ($jdkDir in $found) {
        if (-not $jdkDir -or $seen[$jdkDir]) { continue }
        $seen[$jdkDir] = $true
        $javaExe = Join-Path $jdkDir "bin\java.exe"
        if (-not (Test-Path $javaExe)) { continue }
        $major = Get-JavaMajorVersion $javaExe
        if ($major -ge 17) {
            return $jdkDir
        }
        Write-Host "Skipping Java $major at $jdkDir (need 17+)"
    }

    throw @"
Java 17+ is required (Spring Boot 3).

Your JAVA_HOME may still point to Java 8, or only PATH was updated.
Set JAVA_HOME to the JDK folder (NOT the bin folder), then open a NEW terminal:

  [System.Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot', 'User')

Remove or fix any old JAVA_HOME like:
  C:\Program Files\Java\jdk1.8.0_471

Install JDK 21 if needed:
  winget install Microsoft.OpenJDK.21
"@
}

if (-not (Test-Path $mvn)) {
    Write-Host "Maven not found. Running setup..."
    & (Join-Path $PSScriptRoot "setup-maven.ps1")
}

Set-Location $PSScriptRoot

$env:JAVA_HOME = Resolve-JavaHome
$env:Path = "$env:JAVA_HOME\bin;" + (
    $env:Path -split ';' | Where-Object {
        $_ -and $_ -notmatch 'java8path|jdk1\.8|JDK18~1'
    }
) -join ';'
Write-Host "Using JAVA_HOME=$env:JAVA_HOME"
$prev = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& (Join-Path $env:JAVA_HOME "bin\java.exe") -version 2>&1 | Select-Object -First 1 | ForEach-Object { Write-Host $_ }
$ErrorActionPreference = $prev

# Drop Atlas/srv URIs inherited from Windows or an old shell — .env is the source of truth.
Remove-Item Env:MONGODB_URI -ErrorAction SilentlyContinue
Remove-Item Env:SPRING_DATA_MONGODB_URI -ErrorAction SilentlyContinue

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

if ($env:MONGODB_URI) {
    if ($env:MONGODB_URI -match 'mongodb\+srv') {
        Write-Host "WARNING: .env uses mongodb+srv (Atlas). For local dev use: mongodb://localhost:27017/auth_db"
    }
    $env:SPRING_DATA_MONGODB_URI = $env:MONGODB_URI
    Write-Host "MongoDB: $($env:MONGODB_URI)"
} else {
    Write-Host "MongoDB: mongodb://localhost:27017/auth_db (application.properties default)"
}

if (-not $env:JWT_SECRET) {
    $env:JWT_SECRET = "local-dev-only-change-in-production"
    Write-Host "Using default JWT_SECRET for local dev. Copy .env.example to .env for your own secret."
}

if ($env:GMAIL_USERNAME) {
    Write-Host "Gmail OTP: enabled ($($env:GMAIL_USERNAME))"
} else {
    Write-Host "Gmail OTP: disabled (OTP printed in this console only)"
}

& $mvn spring-boot:run
