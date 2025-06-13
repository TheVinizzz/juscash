import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'JusCash API',
      version: '1.0.0',
      description: 'Sistema de Gerenciamento de Publicações DJE-SP relacionadas ao INSS',
      contact: {
        name: 'JusCash Team',
        email: 'contato@juscash.com.br'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.juscash.com.br' 
          : 'http://localhost:3001',
        description: process.env.NODE_ENV === 'production' ? 'Produção' : 'Desenvolvimento'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único do usuário'
            },
            name: {
              type: 'string',
              description: 'Nome completo do usuário'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do usuário'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data da última atualização'
            }
          }
        },
        Publicacao: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único da publicação'
            },
            numeroProcesso: {
              type: 'string',
              description: 'Número do processo judicial'
            },
            dataDisponibilizacao: {
              type: 'string',
              format: 'date-time',
              description: 'Data de disponibilização no DJE'
            },
            autores: {
              type: 'string',
              description: 'Nomes dos autores da ação'
            },
            advogados: {
              type: 'string',
              description: 'Nomes e OAB dos advogados'
            },
            conteudo: {
              type: 'string',
              description: 'Conteúdo completo da publicação'
            },
            valorPrincipal: {
              type: 'number',
              format: 'float',
              nullable: true,
              description: 'Valor principal da condenação'
            },
            valorJuros: {
              type: 'number',
              format: 'float',
              nullable: true,
              description: 'Valor dos juros moratórios'
            },
            honorarios: {
              type: 'number',
              format: 'float',
              nullable: true,
              description: 'Valor dos honorários advocatícios'
            },
            status: {
              type: 'string',
              enum: ['nova', 'lida', 'enviado para ADV', 'concluída'],
              description: 'Status atual da publicação'
            },
            reu: {
              type: 'string',
              description: 'Nome do réu na ação'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação no sistema'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data da última atualização'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Token JWT para autenticação'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indica se a operação foi bem-sucedida'
            },
            data: {
              description: 'Dados retornados pela API'
            },
            error: {
              type: 'string',
              description: 'Mensagem de erro (apenas quando success = false)'
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  description: 'Página atual'
                },
                limit: {
                  type: 'integer',
                  description: 'Itens por página'
                },
                total: {
                  type: 'integer',
                  description: 'Total de itens'
                },
                totalPages: {
                  type: 'integer',
                  description: 'Total de páginas'
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Mensagem de erro'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/server.ts']
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'JusCash API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showRequestHeaders: true
    }
  }));
  
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export default specs; 