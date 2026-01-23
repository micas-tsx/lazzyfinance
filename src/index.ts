import { criarBot } from './bot/bot';
import { prisma } from './database/client';
import { iniciarLimpezaAutomatica } from './utils/fileCleanup';
import { iniciarServidorWeb } from './server/web.server';
import { iniciarSchedulerGastosFixos } from './scheduler/recurringScheduler';

async function main() {
  console.log('🤖 Iniciando LazzyFinance Bot...');

  // Verifica conexão com o banco
  try {
    await prisma.$connect();
    console.log('✅ Conectado ao PostgreSQL');
  } catch (error) {
    console.error('❌ Erro ao conectar ao PostgreSQL:', error);
    process.exit(1);
  }

  // Inicia servidor web
  try {
    iniciarServidorWeb();
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor web:', error);
    process.exit(1);
  }

  // Cria e inicia o bot
  const bot = criarBot();

  // Inicia limpeza automática de arquivos antigos
  const limpezaInterval = iniciarLimpezaAutomatica();
  console.log('🧹 Limpeza automática de arquivos iniciada (a cada 1 hora)');

  // Inicia scheduler de gastos fixos
  iniciarSchedulerGastosFixos(bot);
  console.log('⏰ Scheduler de gastos fixos iniciado');

  // Inicia o bot
  bot.launch(() => {
    console.log('✅ Bot Telegram iniciado com sucesso!');
  });

  // Graceful shutdown
  process.once('SIGINT', () => {
    console.log('🛑 Encerrando bot...');
    clearInterval(limpezaInterval);
    bot.stop('SIGINT');
    prisma.$disconnect();
    process.exit(0);
  });

  process.once('SIGTERM', () => {
    console.log('🛑 Encerrando bot...');
    clearInterval(limpezaInterval);
    bot.stop('SIGTERM');
    prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
