import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import {
  handleStart,
  handleRelatorio,
  handleExportar,
  handleSite,
  handleGasto,
  handleConfirmacao,
  handleFixo,
  handleFluxoFixo,
  handleMeuFixos,
  handleEditar,
  handleTestarFixos,
  temConfirmacaoPendente,
  temGastoFixoPendente,
} from './handlers';
import { temConfirmacaoGastoFixo, handleConfirmacaoGastoFixo } from '../scheduler/recurringScheduler';

export function criarBot() {
  const bot = new Telegraf(env.telegramBotToken);

  // Comandos
  bot.command('start', handleStart);
  bot.command('relatorio', handleRelatorio);
  bot.command('exportar', handleExportar);
  bot.command('site', handleSite);
  bot.command('fixo', handleFixo);
  bot.command('meu_fixos', handleMeuFixos);
  bot.command('editar', handleEditar);
  bot.command('testar_fixos', (ctx) => handleTestarFixos(ctx, bot));

  // Handler para mensagens de texto
  bot.on('text', async (ctx) => {
    const userId = ctx.from?.id;
    const texto = ctx.message.text?.toLowerCase().trim() || '';

    // Ignora comandos (já tratados acima)
    if (texto.startsWith('/')) {
      return;
    }

    // 1. Verifica se é confirmação de gasto fixo (prioridade máxima)
    if (userId && temConfirmacaoGastoFixo(userId)) {
      const ehResposta = texto.match(/^(sim|não|nao|n|s)$/);
      if (ehResposta) {
        const resposta = (texto === 'sim' || texto === 's') ? 'sim' : 'nao';
        const processado = await handleConfirmacaoGastoFixo(ctx, resposta);
        if (processado) {
          return;
        }
      }
    }

    // 2. Verifica se há gasto fixo pendente (criação/fluxo conversacional)
    if (userId && temGastoFixoPendente(userId)) {
      await handleFluxoFixo(ctx);
      return;
    }

    // 3. Verifica se há confirmação de gasto normal pendente
    const temPendente = temConfirmacaoPendente(userId || 0);
    const ehConfirmacao = texto.match(/^(sim|não|nao|n|s|cancelar|confirmar|confirmo|[1-8])$/);

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
