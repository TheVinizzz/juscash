const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupData() {
  try {
    console.log('🚀 Configurando dados iniciais...');

    // Criar usuário admin
    const admin = await prisma.user.upsert({
      where: { email: 'admin@juscash.com' },
      update: {
        password: '$2a$12$SRFIMhCXbUjZ341iHe2MoeHabQePICu/rU0XOMKMlL9pClLX7JzvO' // senha: 123456
      },
      create: {
        name: 'Administrador',
        email: 'admin@juscash.com',
        password: '$2a$12$SRFIMhCXbUjZ341iHe2MoeHabQePICu/rU0XOMKMlL9pClLX7JzvO' // senha: 123456
      }
    });

    console.log('✅ Usuário admin criado/atualizado');

    // Criar publicações de exemplo
    const publicacoes = [
      {
        numeroProcesso: '5018120-21.2021.8.13.0022',
        dataDisponibilizacao: new Date('2024-10-21T10:00:00Z'),
        autores: 'João Silva Santos',
        reu: 'Instituto Nacional do Seguro Social - INSS',
        advogados: 'Dr. Maria Oliveira (OAB: 123456/SP)\nDr. José Santos (OAB: 789012/SP)',
        conteudo: 'Processo movido em desfavor do Instituto Nacional do Seguro Social - INSS, pleiteando concessão de benefício previdenciário por invalidez.',
        valorPrincipalBruto: 45000.00,
        valorJurosMoratorios: 7200.00,
        honorariosAdvocaticios: 4500.00,
        status: 'nova',
        fonte: 'DJE - Caderno 3 - Judicial - 1ª Instância - Capital Parte 1',
        dataExtracao: new Date()
      },
      {
        numeroProcesso: '5018120-21.2021.8.13.0023',
        dataDisponibilizacao: new Date('2024-10-21T08:30:00Z'),
        autores: 'Maria Fernanda Costa Silva',
        reu: 'Instituto Nacional do Seguro Social - INSS',
        advogados: 'Dr. Pedro Almeida (OAB: 111222/RJ)\nDra. Lucia Mendes (OAB: 333444/RJ)',
        conteudo: 'Ação previdenciária para concessão de pensão por morte.',
        valorPrincipalBruto: 78000.00,
        valorJurosMoratorios: 12500.00,
        honorariosAdvocaticios: 7800.00,
        status: 'lida',
        fonte: 'DJE - Caderno 3 - Judicial - 1ª Instância - Capital Parte 1',
        dataExtracao: new Date()
      },
      {
        numeroProcesso: '5018120-21.2021.8.13.0024',
        dataDisponibilizacao: new Date('2024-10-20T14:00:00Z'),
        autores: 'Carlos Eduardo Martins',
        reu: 'Instituto Nacional do Seguro Social - INSS',
        advogados: 'Dr. Roberto Lima (OAB: 555666/MG)\nDra. Cristina Rocha (OAB: 777888/MG)',
        conteudo: 'Ação ordinária para revisão de benefício previdenciário.',
        valorPrincipalBruto: 125000.00,
        valorJurosMoratorios: 18000.00,
        honorariosAdvocaticios: 12500.00,
        status: 'processada',
        fonte: 'DJE - Caderno 3 - Judicial - 1ª Instância - Capital Parte 1',
        dataExtracao: new Date()
      },
      {
        numeroProcesso: '5018120-21.2021.8.13.0025',
        dataDisponibilizacao: new Date('2024-10-15T11:45:00Z'),
        autores: 'Ana Paula Rodrigues Ferreira',
        reu: 'Instituto Nacional do Seguro Social - INSS',
        advogados: 'Dr. Eduardo Martins (OAB: 121212/SP)\nDra. Beatriz Campos (OAB: 131313/SP)',
        conteudo: 'SENTENÇA: Julgo PROCEDENTE o pedido formulado para condenar o INSS.',
        valorPrincipalBruto: 250000.00,
        valorJurosMoratorios: 35000.00,
        honorariosAdvocaticios: 25000.00,
        status: 'concluida',
        fonte: 'DJE - Caderno 3 - Judicial - 1ª Instância - Capital Parte 1',
        dataExtracao: new Date()
      }
    ];

    for (const pub of publicacoes) {
      await prisma.publicacao.upsert({
        where: { numeroProcesso: pub.numeroProcesso },
        update: pub,
        create: pub
      });
    }

    console.log('✅ Publicações de exemplo criadas/atualizadas');
    console.log('📧 Login: admin@juscash.com');
    console.log('🔑 Senha: 123456');

  } catch (error) {
    console.error('❌ Erro ao configurar dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupData(); 