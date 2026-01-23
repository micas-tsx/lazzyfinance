import { Telegraf } from 'telegraf';
import { buscarGastosFixosPorDia } from '../services/recurring.service';
import { criarTransacao } from '../services/transaction.service';
import { formatarMoeda } from '../utils/dateParser';

// Estado de confirmações de gastos fixos pendentes
// Map: telegramId -> { recurringId, userId, valor, categoria, descricao, nota }
const confirmacoesFixasPendentes = new Map<
  number,
  {
    recurringId: string;
    userId: string;
    valor: number;
    categoria: string;
    descricao: string;
    nota?: string;
  }
>();

/**
 * Inicia o scheduler para verificar gastos fixos diariamente
 * Executa às 9h da manhã todos os dias
 */
export function iniciarSchedulerGastosFixos(bot: Telegraf) {
  // Agenda para rodar todos os dias às 9h
  const intervalo = 24 * 60 * 60 * 1000; // 24 horas em ms
  
  // Calcula tempo até as 9h de hoje (ou amanhã se já passou)
  const agora = new Date();
  const proximaExecucao = new Date();
  proximaExecucao.setHours(9, 0, 0, 0); // 9h da manhã
  
  if (proximaExecucao <= agora) {
    // Se já passou das 9h hoje, agenda para amanhã às 9h
    proximaExecucao.setDate(proximaExecucao.getDate() + 1);
  }
  
  const delay = proximaExecucao.getTime() - agora.getTime();
  
  console.log(`[SCHEDULER] Primeiro check de gastos fixos em ${new Date(Date.now() + delay).toLocaleString('pt-BR')}`);
  
  // Primeira execução
  setTimeout(() => {
    verificarGastosFixosDoDia(bot);
    
    // Depois executa a cada 24h
    setInterval(() => {
      verificarGastosFixosDoDia(bot);
    }, intervalo);
  }, delay);
}

/**
 * Verifica e envia confirmações para gastos fixos do dia
 */
async function verificarGastosFixosDoDia(bot: Telegraf) {
  const hoje = new Date();
  const diaDoMes = hoje.getDate();
  
  console.log(`[SCHEDULER] Verificando gastos fixos para o dia ${diaDoMes}...`);
  
  try {
    const gastosFixos = await buscarGastosFixosPorDia(diaDoMes);
    
    if (gastosFixos.length === 0) {
      console.log(`[SCHEDULER] Nenhum gasto fixo encontrado para o dia ${diaDoMes}`);
      return;
    }
    
    console.log(`[SCHEDULER] ${gastosFixos.length} gasto(s) fixo(s) encontrado(s)`);
    
    // Agrupa por usuário
    const gastosPorUsuario = new Map<bigint, typeof gastosFixos>();
    
    for (const gasto of gastosFixos) {
      const telegramId = gasto.user.telegramId;
      if (!gastosPorUsuario.has(telegramId)) {
        gastosPorUsuario.set(telegramId, []);
      }
      gastosPorUsuario.get(telegramId)!.push(gasto);
    }
    
    // Envia confirmações para cada usuário
    for (const [telegramId, gastos] of gastosPorUsuario) {
      await enviarConfirmacoesParaUsuario(bot, Number(telegramId), gastos);
    }
  } catch (error) {
    console.error('[SCHEDULER] Erro ao verificar gastos fixos:', error);
  }
}

/**
 * Envia confirmações de gastos fixos para um usuário, um por vez
 */
async function enviarConfirmacoesParaUsuario(
  bot: Telegraf,
  telegramId: number,
  gastos: Array<{
    id: string;
    userId: string;
    valor: any;
    descricao: string;
    categoria: any;
    nota: string | null;
    user: { firstName: string | null };
  }>
) {
  if (gastos.length === 0) return;
  
  // Pega o primeiro gasto da fila
  const gasto = gastos[0];
  
  console.log(`[SCHEDULER] Enviando confirmação para usuário ${telegramId} - Gasto: ${gasto.descricao}`);
  
  // Salva no estado de pendentes
  confirmacoesFixasPendentes.set(telegramId, {
    recurringId: gasto.id,
    userId: gasto.userId,
    valor: Number(gasto.valor),
    categoria: gasto.categoria,
    descricao: gasto.descricao,
    nota: gasto.nota || undefined,
  });
  
  const nomeUsuario = gasto.user.firstName || 'usuário';
  
  try {
    let mensagem = `📅 Olá, ${nomeUsuario}!\n\n`;
    mensagem += `📌 *Gasto Fixo do dia ${new Date().getDate()}:*\n\n`;
    mensagem += `💰 ${formatarMoeda(Number(gasto.valor))} - ${gasto.categoria}\n`;
    mensagem += `📝 ${gasto.descricao}\n`;
    if (gasto.nota) {
      mensagem += `📌 ${gasto.nota}\n`;
    }
    mensagem += `\n❓ *Deseja registrar esse gasto este mês?*\n\n`;
    mensagem += `Responda: *sim* ou *não*`;
    
    await bot.telegram.sendMessage(telegramId, mensagem, { parse_mode: 'Markdown' });
    
    // Agenda para enviar o próximo gasto após 30 segundos (caso não responda)
    // Isso será melhorado com um sistema de fila mais robusto
  } catch (error) {
    console.error(`[SCHEDULER] Erro ao enviar mensagem para ${telegramId}:`, error);
  }
}

/**
 * Handler para confirmar gasto fixo
 * Deve ser chamado pelo handler de mensagens do bot
 */
export async function handleConfirmacaoGastoFixo(
  ctx: any,
  resposta: 'sim' | 'nao'
): Promise<boolean> {
  const telegramId = ctx.from?.id;
  
  if (!telegramId) {
    return false;
  }
  
  const pendente = confirmacoesFixasPendentes.get(telegramId);
  
  if (!pendente) {
    return false; // Não há confirmação pendente
  }
  
  try {
    if (resposta === 'sim') {
      // Cria a transação
      await criarTransacao(
        pendente.userId,
        pendente.valor,
        pendente.categoria,
        pendente.descricao,
        new Date(), // Data de hoje
        pendente.nota
      );
      
      await ctx.reply(
        `✅ *Gasto fixo registrado com sucesso!*\n\n` +
        `💸 ${formatarMoeda(pendente.valor)} - ${pendente.categoria}`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply(
        `⏭️ Gasto fixo *não registrado* neste mês.`,
        { parse_mode: 'Markdown' }
      );
    }
    
    // Remove da fila de pendentes
    confirmacoesFixasPendentes.delete(telegramId);
    
    return true;
  } catch (error) {
    console.error('[SCHEDULER] Erro ao processar confirmação de gasto fixo:', error);
    await ctx.reply('❌ Erro ao processar. Tente novamente.');
    return false;
  }
}

/**
 * Verifica se há confirmação de gasto fixo pendente
 */
export function temConfirmacaoGastoFixo(telegramId: number): boolean {
  return confirmacoesFixasPendentes.has(telegramId);
}

/**
 * Executa o scheduler manualmente (útil para testes)
 * Pode ser chamado por um comando do bot
 */
export async function executarSchedulerManualmente(bot: Telegraf) {
  console.log('[SCHEDULER] Execução manual solicitada');
  await verificarGastosFixosDoDia(bot);
}
