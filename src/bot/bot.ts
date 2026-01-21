import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import {
  handleStart,
  handleRelatorio,
  handleExportar,
  handleSite,
  handleGasto,
  handleConfirmacao,
  temConfirmacaoPendente,
} from './handlers';

export function criarBot() {
  const bot = new Telegraf(env.telegramBotToken);

  // Comandos
  bot.command('start', handleStart);
  bot.command('relatorio', handleRelatorio);
  bot.command('exportar', handleExportar);
  bot.command('site', handleSite);

  // Handler para mensagens de texto
  bot.on('text', async (ctx) => {
    const userId = ctx.from?.id;
    const texto = ctx.message.text?.toLowerCase().trim() || '';

    // Ignora comandos (já tratados acima)
    if (texto.startsWith('/')) {
      return;
    }

    // Verifica se há confirmação pendente e se a mensagem parece ser uma resposta de confirmação
    const temPendente = temConfirmacaoPendente(userId || 0);
    const ehConfirmacao = texto.match(/^(sim|não|nao|n|s|cancelar|confirmar|confirmo|[1-6])$/);

    if (temPendente && ehConfirmacao) {
      await handleConfirmacao(ctx);
    } else {
      await handleGasto(ctx);
    }
  });

  // Tratamento de erros
  bot.catch((err, ctx) => {
    console.error('Erro no bot:', err);
    ctx.reply('❌ Ocorreu um erro. Tente novamente.');
  });

  return bot;
}
