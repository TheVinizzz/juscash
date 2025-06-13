FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    xvfb \
    netcat-openbsd \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
    && rm -rf /var/lib/apt/lists/*

# Instalar Chrome baseado na arquitetura com versão específica
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "amd64" ]; then \
        # Adicionar repositório oficial do Google Chrome
        wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
        echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list && \
        apt-get update && \
        # Instalar versão específica estável do Chrome
        apt-get install -y google-chrome-stable=120.0.6099.109-1 || \
        apt-get install -y google-chrome-stable && \
        # Configurar Chrome como binário padrão
        ln -sf /usr/bin/google-chrome /usr/bin/chromium && \
        ln -sf /usr/bin/google-chrome /usr/bin/chrome; \
    else \
        # Para ARM64, usar Chromium
        apt-get update && \
        apt-get install -y chromium chromium-driver && \
        ln -sf /usr/bin/chromium /usr/bin/chrome; \
    fi && \
    rm -rf /var/lib/apt/lists/*

# Configurar variáveis de ambiente para Chrome
ENV CHROME_BIN="/usr/bin/google-chrome"
ENV CHROME_PATH="/usr/bin/google-chrome"
ENV CHROMIUM_PATH="/usr/bin/chromium"
ENV GOOGLE_CHROME_BIN="/usr/bin/google-chrome"

# Criar usuário não-root para executar Chrome
RUN groupadd -r chrome && useradd -r -g chrome -G audio,video chrome \
    && mkdir -p /home/chrome/Downloads \
    && chown -R chrome:chrome /home/chrome

# Copiar requirements primeiro para aproveitar cache do Docker
COPY requirements.txt .

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código da aplicação
COPY . .

# Criar diretórios necessários
RUN mkdir -p /tmp/chrome-user-data /tmp/chrome-crashes \
    && chown -R chrome:chrome /tmp/chrome-user-data /tmp/chrome-crashes \
    && chmod 755 /tmp/chrome-user-data /tmp/chrome-crashes

# Configurar permissões
RUN chown -R chrome:chrome /app

# Configurar display virtual para headless
ENV DISPLAY=:99
ENV CHROME_DEVEL_SANDBOX=/usr/lib/chromium-browser/chrome-sandbox

# Copiar script de entrada personalizado
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 5002

# Mudar para usuário não-root
USER chrome

# Usar script de entrada personalizado
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["python", "real_dje_scraper.py"] 