import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth';
import { spawn } from 'child_process';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

const createPublicacaoSchema = z.object({
  numeroProcesso: z.string().min(1, 'Número do processo é obrigatório'),
  dataDisponibilizacao: z.string().transform(str => new Date(str)),
  autores: z.string().min(1, 'Autores são obrigatórios'),
  advogados: z.string().optional(),
  conteudo: z.string().min(1, 'Conteúdo é obrigatório'),
  valorPrincipalBruto: z.number().nullable().optional(),
  valorPrincipalLiquido: z.number().nullable().optional(),
  valorJurosMoratorios: z.number().nullable().optional(),
  honorariosAdvocaticios: z.number().nullable().optional(),
  reu: z.string().optional(),
  fonte: z.string().optional(),
  termosEncontrados: z.string().optional()
});

const updateStatusSchema = z.object({
  status: z.enum(['nova', 'lida', 'processada', 'concluida'])
});

const validStatusTransitions: Record<string, string[]> = {
  'nova': ['lida'],
  'lida': ['processada'],
  'processada': ['lida', 'concluida'],
  'concluida': []
};

// Estado global da busca automática
let buscaAutomaticaStatus = {
  ativa: false,
  dataInicio: '17/03/2025',
  dataAtual: '',
  dataFim: '',
  totalDias: 0,
  diasProcessados: 0,
  publicacoesEncontradas: 0,
  ultimaAtualizacao: '',
  erro: null
};

/**
 * @swagger
 * /api/publicacoes:
 *   get:
 *     tags:
 *       - Publicações
 *     summary: Listar publicações com filtros e paginação
 *     description: Retorna uma lista paginada de publicações com filtros opcionais
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: numeroProcesso
 *         in: query
 *         description: Filtrar por número do processo
 *         schema:
 *           type: string
 *         example: "1234567-89.2023.1.23.4567"
 *       - name: autor
 *         in: query
 *         description: Filtrar por nome do autor
 *         schema:
 *           type: string
 *         example: "João Silva"
 *       - name: reu
 *         in: query
 *         description: Filtrar por nome do réu
 *         schema:
 *           type: string
 *         example: "INSS"
 *       - name: advogado
 *         in: query
 *         description: Filtrar por nome do advogado
 *         schema:
 *           type: string
 *         example: "Maria Santos OAB/SP 123456"
 *       - name: dataInicial
 *         in: query
 *         description: Data inicial do filtro (formato YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *         example: "2023-01-01"
 *       - name: dataFinal
 *         in: query
 *         description: Data final do filtro (formato YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *         example: "2023-12-31"
 *       - name: page
 *         in: query
 *         description: Número da página (começa em 1)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         example: 1
 *       - name: limit
 *         in: query
 *         description: Número de itens por página (máximo 100)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 30
 *         example: 30
 *     responses:
 *       200:
 *         description: Lista de publicações retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Publicacao'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 30
 *                         total:
 *                           type: integer
 *                           example: 150
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *       401:
 *         description: Token de autenticação inválido ou ausente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      numeroProcesso,
      autor,
      reu,
      advogado,
      dataInicial,
      dataFinal,
      page = '1',
      limit = '30'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 30));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (numeroProcesso) {
      where.numeroProcesso = {
        contains: numeroProcesso as string,
        mode: 'insensitive'
      };
    }

    if (autor) {
      where.autores = {
        contains: autor as string,
        mode: 'insensitive'
      };
    }

    if (reu) {
      where.reu = {
        contains: reu as string,
        mode: 'insensitive'
      };
    }

    if (advogado) {
      where.advogados = {
        contains: advogado as string,
        mode: 'insensitive'
      };
    }

    if (dataInicial || dataFinal) {
      where.dataDisponibilizacao = {};
      if (dataInicial) {
        where.dataDisponibilizacao.gte = new Date(dataInicial as string);
      }
      if (dataFinal) {
        const endDate = new Date(dataFinal as string);
        endDate.setHours(23, 59, 59, 999);
        where.dataDisponibilizacao.lte = endDate;
      }
    }

    const [publicacoes, total] = await Promise.all([
      prisma.publicacao.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
          dataDisponibilizacao: 'desc'
        }
      }),
      prisma.publicacao.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: publicacoes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('Erro ao listar publicações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @swagger
 * /api/publicacoes:
 *   post:
 *     tags:
 *       - Publicações
 *     summary: Criar nova publicação
 *     description: Endpoint usado pelo scraper para criar novas publicações no sistema
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - numeroProcesso
 *               - dataDisponibilizacao
 *               - autores
 *               - advogados
 *               - conteudo
 *             properties:
 *               numeroProcesso:
 *                 type: string
 *                 description: Número único do processo judicial
 *                 example: "1234567-89.2023.1.23.4567"
 *               dataDisponibilizacao:
 *                 type: string
 *                 format: date-time
 *                 description: Data de disponibilização no DJE
 *                 example: "2023-12-01T08:00:00.000Z"
 *               autores:
 *                 type: string
 *                 description: Nomes dos autores da ação (separados por ponto e vírgula)
 *                 example: "João Silva; Maria Santos"
 *               advogados:
 *                 type: string
 *                 description: Nomes e OAB dos advogados (separados por ponto e vírgula)
 *                 example: "Dr. Carlos Lima OAB/SP 123456; Dra. Ana Costa OAB/SP 789012"
 *               conteudo:
 *                 type: string
 *                 description: Conteúdo completo da publicação
 *                 example: "Processo nº 1234567... INSS valor principal R$ 10.000,00..."
 *               valorPrincipalBruto:
 *                 type: number
 *                 format: float
 *                 nullable: true
 *                 description: Valor principal bruto da condenação em reais
 *                 example: 10000.50
 *               valorPrincipalLiquido:
 *                 type: number
 *                 format: float
 *                 nullable: true
 *                 description: Valor principal líquido da condenação em reais
 *                 example: 9500.25
 *               valorJurosMoratorios:
 *                 type: number
 *                 format: float
 *                 nullable: true
 *                 description: Valor dos juros moratórios em reais
 *                 example: 1500.75
 *               honorariosAdvocaticios:
 *                 type: number
 *                 format: float
 *                 nullable: true
 *                 description: Valor dos honorários advocatícios em reais
 *                 example: 2000.00
 *               reu:
 *                 type: string
 *                 description: Nome do réu (padrão INSS)
 *                 default: "Instituto Nacional do Seguro Social - INSS"
 *                 example: "Instituto Nacional do Seguro Social - INSS"
 *     responses:
 *       201:
 *         description: Publicação criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/Publicacao'
 *       400:
 *         description: Dados inválidos ou publicação já existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Publicação com este número de processo já existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = createPublicacaoSchema.parse(req.body);

    const existingPublicacao = await prisma.publicacao.findFirst({
      where: {
        numeroProcesso: validatedData.numeroProcesso
      }
    });

    if (existingPublicacao) {
      res.status(409).json({
        success: false,
        error: 'Publicação com este número de processo já existe'
      });
      return;
    }

    const publicacao = await prisma.publicacao.create({
      data: {
        numeroProcesso: validatedData.numeroProcesso,
        dataDisponibilizacao: validatedData.dataDisponibilizacao,
        autores: validatedData.autores,
        conteudo: validatedData.conteudo,
        advogados: validatedData.advogados || "",
        valorPrincipalBruto: validatedData.valorPrincipalBruto,
        valorPrincipalLiquido: validatedData.valorPrincipalLiquido,
        valorJurosMoratorios: validatedData.valorJurosMoratorios,
        honorariosAdvocaticios: validatedData.honorariosAdvocaticios,
        reu: validatedData.reu || "Instituto Nacional do Seguro Social - INSS",
        fonte: validatedData.fonte || "DJE - Caderno 3 - Judicial - 1ª Instância - Capital Parte 1",
        termosEncontrados: validatedData.termosEncontrados
      }
    });

    res.status(201).json({
      success: true,
      data: publicacao
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0]?.message || 'Dados inválidos'
      });
      return;
    }

    console.error('Erro ao criar publicação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @swagger
 * /api/publicacoes/{id}/status:
 *   patch:
 *     tags:
 *       - Publicações
 *     summary: Atualizar status da publicação
 *     description: Atualiza o status de uma publicação seguindo as regras de transição do Kanban
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID único da publicação
 *         schema:
 *           type: string
 *           format: uuid
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ['nova', 'lida', 'processada', 'concluida']
 *                 description: |
 *                   Novo status da publicação. Transições válidas:
 *                   - nova → lida
 *                   - lida → processada
 *                   - processada → lida ou concluída
 *                   - concluída (status final)
 *                 example: "lida"
 *     responses:
 *       200:
 *         description: Status atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/Publicacao'
 *       400:
 *         description: Transição de status inválida ou dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Publicação não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Token de autenticação inválido ou ausente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id/status', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'ID da publicação é obrigatório'
      });
      return;
    }

    const validatedData = updateStatusSchema.parse(req.body);
    const { status: newStatus } = validatedData;

    const publicacao = await prisma.publicacao.findUnique({
      where: { id }
    });

    if (!publicacao) {
      res.status(404).json({
        success: false,
        error: 'Publicação não encontrada'
      });
      return;
    }

    const currentStatus = publicacao.status as keyof typeof validStatusTransitions;
    const allowedTransitions = validStatusTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      res.status(400).json({
        success: false,
        error: `Transição inválida: não é possível mudar de "${currentStatus}" para "${newStatus}". Transições válidas: ${allowedTransitions.join(', ')}`
      });
      return;
    }

    const updatedPublicacao = await prisma.publicacao.update({
      where: { id: id as string },
      data: { status: newStatus }
    });

    res.json({
      success: true,
      data: updatedPublicacao
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: error.errors[0]?.message || 'Dados inválidos'
      });
      return;
    }

    console.error('Erro ao atualizar status:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @swagger
 * /api/publicacoes/{id}:
 *   get:
 *     tags:
 *       - Publicações
 *     summary: Obter detalhes de uma publicação
 *     description: Retorna os detalhes completos de uma publicação específica
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID único da publicação
 *         schema:
 *           type: string
 *           format: uuid
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Detalhes da publicação retornados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/Publicacao'
 *       404:
 *         description: Publicação não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Token de autenticação inválido ou ausente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const publicacao = await prisma.publicacao.findUnique({
      where: { id }
    });

    if (!publicacao) {
      res.status(404).json({
        success: false,
        error: 'Publicação não encontrada'
      });
      return;
    }

    res.json({
      success: true,
      data: publicacao
    });

  } catch (error) {
    console.error('Erro ao buscar publicação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @swagger
 * /api/publicacoes/scraper/run:
 *   post:
 *     tags:
 *       - Scraper
 *     summary: Executar scraper do DJE
 *     description: Executa o scraper para buscar novas publicações do DJE-TJSP
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               daysBack:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 30
 *                 default: 7
 *                 description: Número de dias para buscar (máximo 30)
 *                 example: 7
 *     responses:
 *       200:
 *         description: Scraper executado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Scraper executado com sucesso"
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total_publicacoes:
 *                       type: integer
 *                       example: 15
 *                     total_inseridas:
 *                       type: integer
 *                       example: 12
 *                     dates_processed:
 *                       type: integer
 *                       example: 7
 *                     errors:
 *                       type: integer
 *                       example: 0
 *       401:
 *         description: Token de autenticação inválido ou ausente
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/scraper/run', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { daysBack = 7 } = req.body;
    
    // Validação
    if (daysBack < 1 || daysBack > 30) {
      res.status(400).json({
        success: false,
        error: 'daysBack deve estar entre 1 e 30'
      });
      return;
    }

    // Chama a API do scraper via HTTP
    try {
      // Tenta primeiro container (produção), depois localhost (desenvolvimento)
      const scraperUrls = [
        'http://juscash-scraper:5002/run-real',  // Container scraper real
        'http://localhost:5002/run-real',        // Local scraper real
        'http://127.0.0.1:5002/run-real'
      ];
      
      let response;
      let lastError;
      
      for (const url of scraperUrls) {
        try {
          console.log(`Tentando conectar com scraper em: ${url}`);
          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ daysBack })
          });
          
          if (response.ok) {
            console.log(`Conectado com sucesso em: ${url}`);
            break;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          console.log(`Falha ao conectar em ${url}: ${errorMessage}`);
          lastError = error;
          continue;
        }
      }
      
      if (!response || !response.ok) {
        throw lastError || new Error('Nenhuma URL do scraper respondeu');
      }

      const result = await response.json() as any;

      if (response.ok && result.success) {
        res.json({
          success: true,
          message: 'Scraper executado com sucesso',
          stats: result.stats
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Erro ao executar scraper',
          details: result.error || 'Erro desconhecido'
        });
      }
    } catch (error) {
      console.error('Erro ao chamar API do scraper:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao conectar com o scraper',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }

  } catch (error) {
    console.error('Erro no endpoint do scraper:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @swagger
 * /api/publicacoes/scraper/status:
 *   get:
 *     tags:
 *       - Scraper
 *     summary: Status do scraper
 *     description: Verifica o status e estatísticas do scraper
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalPublicacoes:
 *                       type: integer
 *                       example: 150
 *                     publicacoesHoje:
 *                       type: integer
 *                       example: 5
 *                     ultimaExecucao:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 */
router.get('/scraper/status', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const [totalPublicacoes, publicacoesHoje, ultimaPublicacao] = await Promise.all([
      prisma.publicacao.count(),
      prisma.publicacao.count({
        where: {
          createdAt: {
            gte: hoje,
            lt: amanha
          }
        }
      }),
      prisma.publicacao.findFirst({
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          createdAt: true
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalPublicacoes,
        publicacoesHoje,
        ultimaExecucao: ultimaPublicacao?.createdAt || null
      }
    });

  } catch (error) {
    console.error('Erro ao obter status do scraper:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * @swagger
 * /api/publicacoes/scraper/run-since-march:
 *   post:
 *     tags:
 *       - Scraper
 *     summary: Executar scraper desde 17/03/2025
 *     description: Executa o scraper para buscar todas as publicações desde 17/03/2025 até hoje
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scraper executado com sucesso
 *       401:
 *         description: Token de autenticação inválido ou ausente
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/scraper/run-since-march', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🚀 Iniciando busca automática desde 17/03/2025');

    // URLs do scraper para busca desde março
    const scraperUrls = [
      'http://juscash-scraper:5002/run-since-march',  // Container scraper real
      'http://localhost:5002/run-since-march',        // Local scraper real
      'http://127.0.0.1:5002/run-since-march'
    ];
    
    let response;
    let lastError;
    
    for (const url of scraperUrls) {
      try {
        console.log(`Tentando conectar com scraper em: ${url}`);
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });
        
        if (response.ok) {
          console.log(`Conectado com sucesso em: ${url}`);
          break;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.log(`Falha ao conectar em ${url}: ${errorMessage}`);
        lastError = error;
        continue;
      }
    }
    
    if (!response || !response.ok) {
      throw lastError || new Error('Nenhuma URL do scraper respondeu');
    }

    const result = await response.json() as any;

    if (response.ok && result.success) {
      res.json({
        success: true,
        message: 'Busca desde 17/03/2025 executada com sucesso',
        stats: result.stats
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro ao executar busca desde março',
        details: result.error || 'Erro desconhecido'
      });
    }

  } catch (error) {
    console.error('Erro ao executar busca desde março:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Função auxiliar para parsear output do scraper
function parseScraperOutput(output: string): any {
  const stats = {
    total_publicacoes: 0,
    total_inseridas: 0,
    dates_processed: 0,
    errors: 0
  };

  try {
    // Busca por padrões no output
    const publicacoesMatch = output.match(/Publicações encontradas:\s*(\d+)/);
    const inseridasMatch = output.match(/Registros inseridos:\s*(\d+)/);
    const datasMatch = output.match(/Datas processadas:\s*(\d+)/);
    const errorsMatch = output.match(/Erros:\s*(\d+)/);

    if (publicacoesMatch && publicacoesMatch[1]) stats.total_publicacoes = parseInt(publicacoesMatch[1]);
    if (inseridasMatch && inseridasMatch[1]) stats.total_inseridas = parseInt(inseridasMatch[1]);
    if (datasMatch && datasMatch[1]) stats.dates_processed = parseInt(datasMatch[1]);
    if (errorsMatch && errorsMatch[1]) stats.errors = parseInt(errorsMatch[1]);
  } catch (error) {
    console.error('Erro ao parsear output do scraper:', error);
  }

  return stats;
}

// Rota para iniciar busca automática
router.post('/busca-automatica/iniciar', auth, async (req, res) => {
  try {
    if (buscaAutomaticaStatus.ativa) {
      return res.json({
        success: false,
        message: 'Busca automática já está em andamento',
        status: buscaAutomaticaStatus
      });
    }

    const dataInicio = new Date('2025-03-17');
    const dataFim = new Date();
    const totalDias = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));

    buscaAutomaticaStatus = {
      ativa: true,
      dataInicio: '17/03/2025',
      dataAtual: dataInicio.toLocaleDateString('pt-BR'),
      dataFim: dataFim.toLocaleDateString('pt-BR'),
      totalDias,
      diasProcessados: 0,
      publicacoesEncontradas: 0,
      ultimaAtualizacao: new Date().toISOString(),
      erro: null
    };

    // Inicia busca em background (não bloqueia a resposta)
    iniciarBuscaBackground().catch(error => {
      console.error('Erro na busca em background:', error);
      buscaAutomaticaStatus.ativa = false;
      buscaAutomaticaStatus.erro = error.message;
    });

    return res.json({
      success: true,
      message: 'Busca automática iniciada',
      status: buscaAutomaticaStatus
    });

  } catch (error) {
    console.error('Erro ao iniciar busca automática:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Rota para verificar status da busca
router.get('/busca-automatica/status', auth, async (req, res) => {
  try {
    return res.json({
      success: true,
      status: buscaAutomaticaStatus
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Rota para parar busca automática
router.post('/busca-automatica/parar', auth, async (req, res) => {
  try {
    buscaAutomaticaStatus.ativa = false;
    buscaAutomaticaStatus.ultimaAtualizacao = new Date().toISOString();

    return res.json({
      success: true,
      message: 'Busca automática interrompida',
      status: buscaAutomaticaStatus
    });
  } catch (error) {
    console.error('Erro ao parar busca:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Função para executar busca em background
async function iniciarBuscaBackground() {
  try {
    const dataInicio = new Date('2025-03-17');
    const dataFim = new Date();
    const dataAtual = new Date(dataInicio);

    console.log(`🚀 Iniciando busca automática otimizada de ${dataInicio.toLocaleDateString('pt-BR')} até ${dataFim.toLocaleDateString('pt-BR')}`);

    while (dataAtual <= dataFim && buscaAutomaticaStatus.ativa) {
      try {
        // Atualiza status
        buscaAutomaticaStatus.dataAtual = dataAtual.toLocaleDateString('pt-BR');
        buscaAutomaticaStatus.ultimaAtualizacao = new Date().toISOString();

        // Verifica se é fim de semana (pula automaticamente)
        const diaSemana = dataAtual.getDay(); // 0=domingo, 6=sábado
        if (diaSemana === 0 || diaSemana === 6) {
          console.log(`⏭️ Pulando ${buscaAutomaticaStatus.dataAtual} - fim de semana`);
          buscaAutomaticaStatus.diasProcessados++;
          dataAtual.setDate(dataAtual.getDate() + 1);
          continue;
        }

        console.log(`📅 Processando data: ${buscaAutomaticaStatus.dataAtual}`);

        // Chama o scraper para buscar dados desta data específica
        const response = await fetch('http://scraper:5000/buscar-data-especifica', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: dataAtual.toLocaleDateString('pt-BR')
          })
        });

        if (response.ok) {
          const resultado = await response.json() as any;
          
          if (resultado.success) {
            // Verifica se foi pulado por algum motivo
            if (resultado.motivo_pulo) {
              console.log(`⏭️ Data ${buscaAutomaticaStatus.dataAtual} pulada: ${resultado.motivo_pulo}`);
            } else if (resultado.publicacoes && resultado.publicacoes.length > 0) {
              // Salva as publicações encontradas
              for (const pubData of resultado.publicacoes) {
                try {
                  await salvarPublicacao(pubData);
                  buscaAutomaticaStatus.publicacoesEncontradas++;
                  console.log(`✅ Publicação salva: ${pubData.numeroProcesso}`);
                } catch (error: any) {
                  console.error(`❌ Erro ao salvar publicação ${pubData.numeroProcesso}:`, error);
                }
              }
            } else {
              console.log(`📄 Nenhuma publicação encontrada para ${buscaAutomaticaStatus.dataAtual}`);
            }
          } else {
            console.warn(`⚠️ Erro na busca para ${buscaAutomaticaStatus.dataAtual}: ${resultado.error}`);
          }
        } else {
          console.warn(`⚠️ Erro HTTP na busca para ${buscaAutomaticaStatus.dataAtual}: ${response.status}`);
        }

        buscaAutomaticaStatus.diasProcessados++;

        // Avança para o próximo dia
        dataAtual.setDate(dataAtual.getDate() + 1);

        // Pausa reduzida entre requisições (1 segundo)
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        console.error(`❌ Erro ao processar data ${buscaAutomaticaStatus.dataAtual}:`, error);
        buscaAutomaticaStatus.erro = error.message;
        
        // Avança para próxima data mesmo com erro
        buscaAutomaticaStatus.diasProcessados++;
        dataAtual.setDate(dataAtual.getDate() + 1);
        
        // Pausa maior em caso de erro
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // Finaliza busca
    if (buscaAutomaticaStatus.ativa) {
      buscaAutomaticaStatus.ativa = false;
      buscaAutomaticaStatus.ultimaAtualizacao = new Date().toISOString();
      console.log(`🎉 Busca automática concluída! ${buscaAutomaticaStatus.publicacoesEncontradas} publicações encontradas.`);
    }

  } catch (error: any) {
    console.error('❌ Erro na busca automática:', error);
    buscaAutomaticaStatus.ativa = false;
    buscaAutomaticaStatus.erro = error.message;
    buscaAutomaticaStatus.ultimaAtualizacao = new Date().toISOString();
  }
}

// Função auxiliar para salvar publicação
async function salvarPublicacao(publicacaoData: any) {
  try {
    // Verifica se já existe
    const existente = await prisma.publicacao.findFirst({
      where: { numeroProcesso: publicacaoData.numeroProcesso }
    });

    if (existente) {
      console.log(`📋 Publicação já existe: ${publicacaoData.numeroProcesso}`);
      return existente;
    }

    // Cria nova publicação
    const novaPublicacao = await prisma.publicacao.create({
      data: {
        numeroProcesso: publicacaoData.numeroProcesso,
        dataDisponibilizacao: new Date(publicacaoData.dataDisponibilizacao),
        autores: publicacaoData.autores || '',
        advogados: publicacaoData.advogados || '',
        reu: publicacaoData.reu || 'Instituto Nacional do Seguro Social - INSS',
        conteudo: publicacaoData.conteudo || '',
        valorPrincipalBruto: publicacaoData.valorPrincipalBruto ? parseFloat(publicacaoData.valorPrincipalBruto.toString()) : null,
        valorPrincipalLiquido: publicacaoData.valorPrincipalLiquido ? parseFloat(publicacaoData.valorPrincipalLiquido.toString()) : null,
        valorJurosMoratorios: publicacaoData.valorJurosMoratorios ? parseFloat(publicacaoData.valorJurosMoratorios.toString()) : null,
        honorariosAdvocaticios: publicacaoData.honorariosAdvocaticios ? parseFloat(publicacaoData.honorariosAdvocaticios.toString()) : null,
        status: 'nova',
        termosEncontrados: publicacaoData.termosEncontrados || ''
      }
    });

    return novaPublicacao;
  } catch (error: any) {
    console.error('Erro ao salvar publicação:', error);
    throw error;
  }
}

// Rota para busca personalizada com termos e datas
router.post('/scraper/busca-personalizada', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { termos, dataInicio, dataFim } = req.body;
    
    if (!termos || !dataInicio || !dataFim) {
      res.status(400).json({
        success: false,
        message: 'Termos de busca, data de início e data fim são obrigatórios'
      });
      return;
    }

    console.log(`🔍 Iniciando busca personalizada: termos="${termos}", período=${dataInicio} até ${dataFim}`);

    // URLs dos scrapers para tentar
    const scraperUrls = [
      'http://juscash-scraper:5002/busca-personalizada',  // Container scraper real
      'http://localhost:5002/busca-personalizada',        // Local scraper real
      'http://127.0.0.1:5002/busca-personalizada'
    ];

    let scraperResponse: any = null;
    let scraperUrl = '';

    // Tenta cada scraper até encontrar um que funcione
    for (const url of scraperUrls) {
      try {
        console.log(`🔗 Tentando conectar ao scraper: ${url}`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            termos: termos,
            data_inicio: dataInicio,
            data_fim: dataFim
          }),
          signal: AbortSignal.timeout(1800000) // 30 minutos timeout
        });

        if (response.ok) {
          scraperResponse = await response.json();
          scraperUrl = url;
          console.log(`✅ Scraper conectado com sucesso: ${url}`);
          break;
        }
      } catch (error) {
        console.warn(`⚠️ Scraper ${url} não disponível: ${error}`);
        continue;
      }
    }

    if (!scraperResponse) {
      res.status(503).json({
        success: false,
        message: 'Nenhum scraper disponível no momento'
      });
      return;
    }

    // Processa as publicações retornadas
    let publicacoesSalvas = 0;
    const publicacoesProcessadas = [];

    if (scraperResponse.publicacoes && Array.isArray(scraperResponse.publicacoes)) {
      for (const pubData of scraperResponse.publicacoes) {
        try {
          const publicacaoSalva = await salvarPublicacao(pubData);
          if (publicacaoSalva) {
            publicacoesProcessadas.push(publicacaoSalva);
            publicacoesSalvas++;
          }
        } catch (error) {
          console.error(`❌ Erro ao salvar publicação: ${error}`);
        }
      }
    }

    console.log(`✅ Busca personalizada concluída: ${publicacoesSalvas} publicações salvas`);

    res.json({
      success: true,
      message: `Busca personalizada concluída com sucesso`,
      data: {
        scraperUrl,
        termosBuscados: termos,
        periodo: `${dataInicio} até ${dataFim}`,
        publicacoesEncontradas: scraperResponse.publicacoes?.length || 0,
        publicacoesSalvas,
        publicacoes: publicacoesProcessadas,
        tempoExecucao: scraperResponse.tempo_execucao || 'N/A'
      }
    });

  } catch (error) {
    console.error(`❌ Erro na busca personalizada: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor durante a busca personalizada'
    });
  }
});

// Rota para verificar progresso da busca (proxy para o scraper)
router.get('/scraper/progresso-busca', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔍 Consultando progresso da busca...');
    
    // URLs dos scrapers para tentar
    const scraperUrls = [
      'http://juscash-scraper:5002/progresso-busca',  // Container scraper real
      'http://localhost:5002/progresso-busca',        // Local scraper real
      'http://127.0.0.1:5002/progresso-busca'
    ];

    let scraperResponse: any = null;

    // Tenta cada scraper até encontrar um que funcione
    for (const url of scraperUrls) {
      try {
        console.log(`🔗 Tentando conectar ao scraper: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          scraperResponse = await response.json();
          console.log(`✅ Scraper conectado com sucesso: ${url}`);
          break;
        }
      } catch (error) {
        console.warn(`⚠️ Scraper ${url} não disponível: ${error}`);
        continue;
      }
    }

    if (!scraperResponse) {
      res.status(503).json({
        success: false,
        message: 'Nenhum scraper disponível no momento'
      });
      return;
    }

    res.json(scraperResponse);

  } catch (error) {
    console.error(`❌ Erro ao consultar progresso: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

export default router; 