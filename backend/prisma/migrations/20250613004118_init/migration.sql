-- CreateEnum
CREATE TYPE "Status" AS ENUM ('nova', 'lida', 'processada', 'concluida');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicacoes" (
    "id" TEXT NOT NULL,
    "numeroProcesso" TEXT NOT NULL,
    "dataDisponibilizacao" TIMESTAMP(3) NOT NULL,
    "autores" TEXT NOT NULL,
    "reu" TEXT NOT NULL DEFAULT 'Instituto Nacional do Seguro Social - INSS',
    "advogados" TEXT,
    "conteudo" TEXT NOT NULL,
    "valorPrincipalBruto" DECIMAL(15,2),
    "valorPrincipalLiquido" DECIMAL(15,2),
    "valorJurosMoratorios" DECIMAL(15,2),
    "honorariosAdvocaticios" DECIMAL(15,2),
    "status" "Status" NOT NULL DEFAULT 'nova',
    "dataExtracao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fonte" TEXT NOT NULL DEFAULT 'DJE - Caderno 3 - Judicial - 1ª Instância - Capital Parte 1',
    "termosEncontrados" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publicacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "publicacoes_numeroProcesso_key" ON "publicacoes"("numeroProcesso");

-- CreateIndex
CREATE INDEX "publicacoes_status_idx" ON "publicacoes"("status");

-- CreateIndex
CREATE INDEX "publicacoes_numeroProcesso_idx" ON "publicacoes"("numeroProcesso");

-- CreateIndex
CREATE INDEX "publicacoes_dataDisponibilizacao_idx" ON "publicacoes"("dataDisponibilizacao");

-- CreateIndex
CREATE INDEX "publicacoes_createdAt_idx" ON "publicacoes"("createdAt");
