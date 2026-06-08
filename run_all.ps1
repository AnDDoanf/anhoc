# run_all.ps1
# PowerShell script to easily run the 3 services (Frontend, Backend, Chatbot) of the Anhoc project

Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Starting Anhoc Math Learning Platform  " -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Verify node_modules exist, if not run installation script
if (-not (Test-Path "frontend\node_modules") -or -not (Test-Path "backend\node_modules")) {
    Write-Host "[!] node_modules are missing. Installing dependencies first..." -ForegroundColor Yellow
    npm run install:all
}

# Run the concurrent dev command
Write-Host "[+] Launching Frontend (Port 5000), Backend (Port 5001), and Chatbot (Port 5002)..." -ForegroundColor Cyan
npm run dev
