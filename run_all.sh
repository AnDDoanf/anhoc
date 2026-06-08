#!/bin/bash
# run_all.sh script to run all 3 services from Git Bash or Linux/macOS

echo "========================================="
echo "  Starting Anhoc Math Learning Platform  "
echo "========================================="

# Verify node_modules exist, if not run installation script
if [ ! -d "frontend/node_modules" ] || [ ! -d "backend/node_modules" ]; then
    echo "[!] node_modules are missing. Installing dependencies first..."
    npm run install:all
fi

# Run the concurrent dev command
echo "[+] Launching Frontend (Port 5000), Backend (Port 5001), and Chatbot (Port 5002)..."
npm run dev
