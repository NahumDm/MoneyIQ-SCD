$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$python = "py"
$pyArgs = @("-3.13")
if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
    $python = "python"
    $pyArgs = @()
}

if (-not (Test-Path ".venv")) {
    Write-Host "Creating Python 3.13 virtual environment..."
    & $python @pyArgs -m venv .venv
}

& .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt -q
python run.py
