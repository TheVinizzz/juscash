#!/bin/bash

echo "🔧 Iniciando JusCash em modo de desenvolvimento"
echo "=============================================="

# Verificar se as dependências estão instaladas
echo "📦 Verificando dependências..."

# Backend
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Instalando dependências do backend..."
    cd backend && npm install && cd ..
fi

# Frontend
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Instalando dependências do frontend..."
    cd frontend && npm install && cd ..
fi

# Scraper
if [ ! -d "scraper/venv" ]; then
    echo "🐍 Criando ambiente virtual Python..."
    cd scraper && python -m venv venv && cd ..
fi

echo "✅ Dependências verificadas!"
echo ""
echo "🚀 Para iniciar em modo desenvolvimento:"
echo "=============================================="
echo "Terminal 1 - Backend:"
echo "cd backend && npm run dev"
echo ""
echo "Terminal 2 - Frontend:"
echo "cd frontend && npm run dev"
echo ""
echo "Terminal 3 - Scraper:"
echo "cd scraper && source venv/bin/activate && pip install -r requirements.txt && python real_dje_scraper.py"
echo ""
echo "🔗 URLs de desenvolvimento:"
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:3001"
echo "Scraper:  http://localhost:5002" 