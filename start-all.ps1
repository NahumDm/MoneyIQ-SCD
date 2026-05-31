# Start all SCD services (MongoDB: 192.168.137.1:27017 via .env files)

$root = $PSScriptRoot
$ps = "powershell -NoExit -ExecutionPolicy Bypass -Command"

Write-Host "Launching all services in new windows..."
Write-Host ""

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$root\auth-service\run-auth.ps1"
Start-Sleep -Seconds 8

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$root\expense-service\run-expense.ps1"
Start-Sleep -Seconds 3

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\pdf-service'; npm install; npm start"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\integration-layer'; npm run build; npm start"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host "Done. Open http://localhost:5173 (or 5174 if port busy)"
Write-Host "Gateway: http://localhost:8080"
