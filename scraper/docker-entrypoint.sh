#!/bin/bash

# Script de entrada para o container do scraper
echo "🚀 Iniciando scraper JusCash..."

# Configurar variáveis de ambiente
export DISPLAY=:99
export CHROME_BIN=/usr/bin/google-chrome
export CHROME_PATH=/usr/bin/google-chrome

# Verificar se o Chrome está disponível
if [ -f "/usr/bin/google-chrome" ]; then
    CHROME_BIN="/usr/bin/google-chrome"
    echo "✅ Google Chrome encontrado: $CHROME_BIN"
elif [ -f "/usr/bin/chromium" ]; then
    CHROME_BIN="/usr/bin/chromium"
    echo "✅ Chromium encontrado: $CHROME_BIN"
else
    echo "⚠️  Nenhum navegador encontrado, usando modo simulado"
fi

# Configurar Xvfb se não estiver rodando
if ! pgrep -x "Xvfb" > /dev/null; then
    echo "🖥️  Iniciando Xvfb (display virtual)..."
    Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
    XVFB_PID=$!
    echo "Xvfb iniciado com PID: $XVFB_PID"
    
    # Aguardar o display estar pronto
    sleep 3
    
    # Verificar se Xvfb está rodando
    if pgrep -x "Xvfb" > /dev/null; then
        echo "✅ Xvfb rodando com sucesso"
    else
        echo "⚠️  Xvfb pode ter problemas, continuando sem display virtual"
    fi
else
    echo "✅ Xvfb já está rodando"
fi

# Configurar diretórios de trabalho do Chrome
export CHROME_USER_DATA_DIR="/tmp/chrome-user-data"
export CHROME_CRASH_DIR="/tmp/chrome-crashes"

# Verificar se o Chrome está funcionando (apenas se disponível)
if [ -f "$CHROME_BIN" ]; then
    echo "🧪 Testando Chrome..."
    
    # Testar Chrome com timeout
    if timeout 10s $CHROME_BIN --version > /dev/null 2>&1; then
        echo "✅ Chrome funcionando: $($CHROME_BIN --version)"
    else
        echo "⚠️  Chrome pode ter problemas, mas continuando..."
    fi
fi

# Aguardar backend estar disponível (se não for modo local)
if [ "${API_URL}" != "http://localhost:3001" ] && [ -n "${API_URL}" ]; then
    BACKEND_HOST=$(echo $API_URL | sed 's|http://||' | sed 's|:.*||')
    BACKEND_PORT=$(echo $API_URL | sed 's|.*:||')
    
    echo "⏳ Aguardando backend estar disponível em $BACKEND_HOST:$BACKEND_PORT..."
    
    # Aguardar com timeout
    WAIT_TIME=0
    MAX_WAIT=120
    
    while ! nc -z $BACKEND_HOST $BACKEND_PORT 2>/dev/null; do
        if [ $WAIT_TIME -ge $MAX_WAIT ]; then
            echo "⚠️  Timeout aguardando backend. Continuando sem verificação..."
            break
        fi
        echo "   Tentando conectar ao backend... ($WAIT_TIME/$MAX_WAIT segundos)"
        sleep 5
        WAIT_TIME=$((WAIT_TIME + 5))
    done
    
    if nc -z $BACKEND_HOST $BACKEND_PORT 2>/dev/null; then
        echo "✅ Backend conectado!"
    fi
else
    echo "ℹ️  Modo local ou API_URL não definida, pulando verificação de backend"
fi

# Configurar permissões finais
chmod 755 /tmp/chrome-user-data /tmp/chrome-crashes 2>/dev/null || true

# Executar comando passado
echo "🔄 Executando: $@"
echo "📊 Configurações do ambiente:"
echo "   - DISPLAY: $DISPLAY"
echo "   - CHROME_BIN: $CHROME_BIN"
echo "   - USER: $(whoami)"
echo "   - API_URL: ${API_URL:-'não definida'}"
echo "=================================="

exec "$@" 