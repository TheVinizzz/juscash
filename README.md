# JusCash - Sistema de Monitoramento DJE-TJSP

## 🚀 Início Rápido (2 minutos)

### 📋 Pré-requisitos
- [Docker](https://www.docker.com/get-started) e Docker Compose instalados
- Git

### ⚡ Execução em 3 passos

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd juscash

# 2. Configure o ambiente
cp env.example .env

# 3. Execute tudo com Docker
docker-compose up -d --build
```

**Pronto! 🎉** 
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Documentação**: http://localhost:3001/api-docs

---

## 📋 Sobre o Sistema

O **JusCash** é uma aplicação completa para monitoramento automatizado de publicações do Diário da Justiça Eletrônico do Tribunal de Justiça de São Paulo (DJE-TJSP). O sistema permite realizar buscas personalizadas por termos específicos e gerenciar as publicações encontradas através de um quadro Kanban intuitivo.

### 🎯 Funcionalidades Principais

- **Web Scraping Automatizado**: Coleta dados do DJE-TJSP com busca por termos personalizados
- **Quadro Kanban**: Interface visual para gerenciamento de publicações encontradas
- **API RESTful**: Backend robusto com autenticação e endpoints documentados
- **Busca Avançada**: Filtros por período, termos específicos e status
- **Autenticação**: Sistema de login seguro com JWT
- **Responsivo**: Interface adaptável para desktop e mobile

## 🏗️ Arquitetura

O sistema é composto por 4 componentes principais:

- **Frontend**: React.js com TypeScript e Tailwind CSS
- **Backend**: Node.js com Express e Prisma ORM
- **Scraper**: Python com Selenium e Flask
- **Banco de Dados**: PostgreSQL

## 🔧 Configuração do Ambiente

### 📄 Arquivo .env

O projeto inclui um arquivo `env.example` com todas as configurações necessárias. Basta copiá-lo:

```bash
cp env.example .env
```

**Conteúdo do arquivo (já configurado para Docker):**

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/juscash"

# JWT Configuration
JWT_SECRET="juscash-super-secret-key-2024"

# API Configuration
NODE_ENV="development"
PORT=3001

# Frontend Configuration
VITE_API_URL="http://localhost:3001/api"

# Scraper Configuration
API_URL="http://localhost:3001"
HEADLESS="false"

# PostgreSQL Configuration
POSTGRES_DB="juscash"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres123"
```

> **Nota**: Para produção, altere as senhas e secrets!

## 🐳 Executando com Docker

### Método 1: Comando Único
```bash
docker-compose up -d --build
```

### Método 2: Passo a passo
```bash
# Construir as imagens
docker-compose build

# Subir os serviços
docker-compose up -d

# Verificar status
docker-compose ps
```

### 📊 Verificar se tudo está funcionando

```bash
# Status dos containers
docker-compose ps

# Logs em tempo real
docker-compose logs -f

# Testar endpoints
curl http://localhost:3001/api/health
curl http://localhost:5002/health
```

### 🛑 Parar a aplicação

```bash
# Parar containers
docker-compose down

# Parar e remover dados do banco
docker-compose down -v
```

## 📱 Como Usar a Aplicação

### 1. **Primeira Execução**
1. Acesse http://localhost:3000
2. Registre-se ou faça login
3. Você será redirecionado para o dashboard

### 2. **Realizar Busca no DJE-TJSP**
1. Clique em "Nova Busca"
2. Preencha:
   - **Termos**: Ex: "INSS", "RPV", "IPVA"
   - **Data Início/Fim**: Período da busca
3. Clique em "Iniciar Busca"
4. Acompanhe o progresso

### 3. **Gerenciar Publicações**
- Use o quadro Kanban para organizar as publicações
- Arraste entre as colunas: Pendente → Enviado → Concluída
- Clique nas publicações para ver detalhes

## 🐛 Solução de Problemas

### 🔴 Containers não sobem
```bash
# Ver logs detalhados
docker-compose logs

# Reconstruir tudo
docker-compose down
docker-compose up --build -d
```

### 🔴 Erro de porta ocupada
```bash
# Verificar portas em uso
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :5432  # PostgreSQL
lsof -i :5002  # Scraper

# Matar processos se necessário
sudo kill -9 <PID>
```

### 🔴 Banco de dados não conecta
```bash
# Resetar banco
docker-compose down -v
docker-compose up postgres -d
# Aguardar 30 segundos
docker-compose up -d
```

### 🔴 Scraper não funciona
```bash
# Verificar logs do scraper
docker-compose logs scraper

# Reiniciar apenas o scraper
docker-compose restart scraper
```

## 🛠️ Desenvolvimento Local (Opcional)

Se preferir rodar sem Docker:

### Backend
```bash
cd backend
npm install
cp ../env.example .env
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

### Scraper
```bash
cd scraper
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python real_dje_scraper.py
```

## 📊 Endpoints da API

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro

### Publicações
- `GET /api/publicacoes` - Listar
- `POST /api/publicacoes` - Criar
- `PUT /api/publicacoes/:id` - Atualizar
- `DELETE /api/publicacoes/:id` - Deletar

### Scraper
- `POST /busca-personalizada` - Iniciar busca
- `GET /progresso-busca` - Verificar progresso
- `GET /health` - Status

## 📈 Monitoramento

### Health Checks
- **Backend**: http://localhost:3001/api/health
- **Scraper**: http://localhost:5002/health

### Logs
```bash
# Todos os serviços
docker-compose logs -f

# Serviço específico
docker-compose logs -f backend
docker-compose logs -f scraper
```

## 🤝 Suporte

Se encontrar problemas:

1. **Verifique os logs**: `docker-compose logs`
2. **Reinicie os containers**: `docker-compose restart`
3. **Reconstrua tudo**: `docker-compose down && docker-compose up --build -d`

---

**🎯 Dica**: Para uma experiência mais suave, sempre execute `docker-compose down -v && docker-compose up --build -d` se houver problemas. 