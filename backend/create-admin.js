const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Verificar se já existe um admin
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@juscash.com' }
    });

    if (existingAdmin) {
      console.log('✅ Usuário admin já existe');
      return;
    }

    // Criar hash da senha
    const hashedPassword = await bcrypt.hash('123456', 10);

    // Criar usuário admin
    const admin = await prisma.user.create({
      data: {
        name: 'Administrador',
        email: 'admin@juscash.com',
        password: hashedPassword
      }
    });

    console.log('✅ Usuário admin criado com sucesso!');
    console.log('📧 Email: admin@juscash.com');
    console.log('🔑 Senha: 123456');

  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin(); 