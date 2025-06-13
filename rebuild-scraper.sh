#!/bin/bash

echo "🔄 Reconstruindo Scraper JusCash com melhorias"
echo "=============================================="

# Parar container existente
echo "🛑 Parando container do scraper..."
docker-compose stop scraper

# Remover container e imagem do scraper
echo "🗑️  Removendo container e imagem antigas..."
docker-compose rm -f scraper
docker rmi juscash-scraper 2>/dev/null || true

# Reconstruir apenas o scraper
echo "🔨 Reconstruindo container do scraper..."
docker-compose build scraper

# Iniciar o scraper
echo "🚀 Iniciando scraper..."
docker-compose up -d scraper

# Aguardar um pouco para o container inicializar
echo "⏳ Aguardando inicialização..."
sleep 10

# Verificar status
echo "📊 Status do scraper:"
docker-compose ps scraper

# Mostrar logs recentes
echo ""
echo "📋 Logs recentes do scraper:"
echo "=================================="
docker-compose logs --tail=20 scraper

echo ""
echo "✅ Scraper reconstruído!"
echo "=================================="
echo "Para ver logs em tempo real:"
echo "docker-compose logs -f scraper"
echo ""
echo "Para testar o scraper:"
echo "curl -X POST http://localhost:5002/busca-personalizada \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"termos\": \"INSS\", \"data_inicio\": \"10/06/2025\", \"data_fim\": \"11/06/2025\"}'" 