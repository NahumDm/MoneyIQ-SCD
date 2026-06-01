$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Avoid stale Atlas URI from Windows / parent shell; expense-service/.env wins.
Remove-Item Env:MONGODB_URI -ErrorAction SilentlyContinue

$python = $null
$pyArgs = @()
foreach ($ver in @("3.14", "3.13", "3.12", "3.11")) {
    if (Get-Command py -ErrorAction SilentlyContinue) {
        $null = & py "-$ver" -c "import sys" 2>$null
        if ($LASTEXITCODE -eq 0) {
            $python = "py"
            $pyArgs = @("-$ver")
            break
        }
    }
}
if (-not $python) {
    $python = "python"
    $pyArgs = @()
}

if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment (.venv) with $python $($pyArgs -join ' ')..."
    & $python @pyArgs -m venv .venv
}

& .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip -q
python -m pip install -r requirements.txt
python run.py
