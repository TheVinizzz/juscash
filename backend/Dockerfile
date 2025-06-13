FROM node:18-alpine

# Instalar OpenSSL para o Prisma e wget para health check
RUN apk add --no-cache openssl wget

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

RUN npx prisma generate

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push && npm start"] 