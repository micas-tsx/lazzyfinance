import { Context } from 'telegraf';
import { categorizarGasto } from '../services/ollama.service';
import { criarTransacao, gerarRelatorioMensal } from '../services/transaction.service';
import { criarOuObterUsuario, obterUsuarioPorTelegramId } from '../services/user.service';
import { parseData, formatarData, formatarMoeda, parseMes } from '../utils/dateParser';
import { gerarExcelTransacoes } from '../services/export.service';
import { obterOuGerarToken } from '../services/token.service';
import { env } from '../config/env';
import * as fs from 'fs';

// Estado temporário para confirmações pendentes
interface ConfirmacaoPendente {
  userId: string; // ID interno do usuário no banco
  valor: number;
  categoria: string;
  descricao: string;
  dataGasto: Date;
  nota?: string;
}

const confirmacoesPendentes = new Map<number, ConfirmacaoPendente>(); // Key: Telegram ID

/**
 * Verifica se há confirmação pendente para um usuário
 */
export function temConfirmacaoPendente(userId: number): boolean {
  return confirmacoesPendentes.has(userId);
}

/**
 * Handler para comando /site
 * Gera um link único para acesso ao dashboard web
 */
export async function handleSite(ctx: Context) {
  const telegramUser = ctx.from;

  if (!telegramUser) {
    await ctx.reply('❌ Erro ao identificar usuário.');
    return;
  }

  try {
    console.log(`[BOT] Comando /site recebido do usuário ${telegramUser.id}`);
    
    // Cria ou obtém o usuário no banco
    const usuario = await criarOuObterUsuario({
      id: telegramUser.id,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      username: telegramUser.username,
      language_code: telegramUser.language_code,
    });

    console.log(`[BOT] Obtendo ou gerando token para usuário ${usuario.id}`);
    
    // Obtém ou gera token único
    const token = await obterOuGerarToken(usuario.id);
    
    console.log(`[BOT] Token gerado: ${token.substring(0, 8)}...`);
    
    // Monta URL do dashboard
    const url = `${env.webBaseUrl}/?token=${token}`;
    
    console.log(`[BOT] URL gerada: ${url}`);

    await ctx.reply(
      `🌐 *Seu Dashboard LazzyFinance*\n\n` +
      `📊 Acesse seu painel com gráficos e relatórios:\n\n` +
      `${url}\n\n` +
      `⚠️ *Atenção:* Este link é pessoal e expira em 7 dias.\n` +
      `Não compartilhe com outras pessoas.`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('[BOT] Erro ao gerar link do site:', error);
    await ctx.reply('❌ Erro ao gerar link. Tente novamente.');
  }
}

/**
 * Handler para comando /start
 * Registra o usuário automaticamente se ainda não existir
 */
export async function handleStart(ctx: Context) {
  const telegramUser = ctx.from;

  if (!telegramUser) {
    await ctx.reply('❌ Erro ao identificar usuário.');
    return;
  }

  try {
    // Cria ou obtém o usuário no banco
    const usuario = await criarOuObterUsuario({
      id: telegramUser.id,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      username: telegramUser.username,
      language_code: telegramUser.language_code,
    });

    const nomeUsuario = usuario.firstName || usuario.username || 'usuário';

    await ctx.reply(
      `👋 Olá, ${nomeUsuario}! Eu sou o LazzyFinance bot.\n\n` +
      `📝 Para registrar um *gasto*, envie uma mensagem como:\n` +
      `• "gastei 50 reais no mercado"\n` +
      `• "gastei 100 reais de uber hoje"\n` +
      `• "gastei 200 reais de aluguel em 01/01/2025"\n\n` +
      `💰 Para registrar um *ganho*, envie uma mensagem como:\n` +
      `• "ganhei 1500 reais de salário"\n` +
      `• "lucrei 500 reais que recebi de freela"\n` +
      `• "lucrei 200 reais de venda hoje"\n\n` +
      `📊 Use /relatorio <mês> para ver o relatório mensal.\n` +
      `Exemplo: /relatorio agosto\n\n` +
      `📥 Use /exportar <mês> para exportar transações em Excel.\n` +
      `Exemplo: /exportar agosto\n\n` +
      `🌐 Use /site para acessar seu dashboard web com gráficos.`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    await ctx.reply('❌ Erro ao inicializar. Tente novamente.');
  }
}

/**
 * Handler para comando /relatorio
 */
export async function handleRelatorio(ctx: Context) {
  const texto = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
  const partes = texto.split(' ');

  if (partes.length < 2) {
    await ctx.reply(
      '⚠️ Use o formato: /relatorio <mês>\n' +
      'Exemplo: /relatorio agosto\n' +
      'Exemplo: /relatorio agosto 2025'
    );
    return;
  }

  const mesNome = partes[1];
  const mes = parseMes(mesNome);

  if (!mes) {
    await ctx.reply(
      '⚠️ Mês inválido. Use o nome do mês em português.\n' +
      'Exemplo: janeiro, fevereiro, março, etc.'
    );
    return;
  }

  // Tenta extrair o ano se fornecido
  let ano = new Date().getFullYear();
  if (partes.length >= 3) {
    const anoFornecido = parseInt(partes[2]);
    if (!isNaN(anoFornecido) && anoFornecido > 2000 && anoFornecido < 2100) {
      ano = anoFornecido;
    }
  }

  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) {
    await ctx.reply('❌ Erro ao identificar usuário.');
    return;
  }

  try {
    // Obtém o usuário do banco
    const usuario = await obterUsuarioPorTelegramId(telegramUserId);
    if (!usuario) {
      await ctx.reply('⚠️ Você precisa usar /start primeiro para se registrar.');
      return;
    }

    const relatorio = await gerarRelatorioMensal(usuario.id, mes, ano);

    if (relatorio.quantidadeTransacoes === 0) {
      await ctx.reply(
        `📊 Nenhuma transação encontrada para ${mesNome} de ${ano}.`
      );
      return;
    }

    let mensagem = `📊 *Relatório de ${mesNome} de ${ano}*\n\n`;
    
    // Resumo geral
    mensagem += `💰 *Ganhos:* ${formatarMoeda(relatorio.totalGanhos)} (${relatorio.quantidadeGanhos}x)\n`;
    mensagem += `💸 *Gastos:* ${formatarMoeda(relatorio.totalGastos)} (${relatorio.quantidadeGastos}x)\n`;
    mensagem += `━━━━━━━━━━━━━━━━━━\n`;
    
    // Saldo líquido com emoji baseado no resultado
    const emojiSaldo = relatorio.saldoLiquido >= 0 ? '✅' : '⚠️';
    mensagem += `${emojiSaldo} *Saldo Líquido:* ${formatarMoeda(relatorio.saldoLiquido)}\n\n`;
    
    mensagem += `📝 *Total de Transações:* ${relatorio.quantidadeTransacoes}\n\n`;
    mensagem += `*Por Categoria:*\n`;

    // Ordena categorias: LUCROS primeiro, depois as outras
    const categoriasOrdenadas = [...relatorio.resumoPorCategoria].sort((a, b) => {
      if (a.categoria === 'LUCROS') return -1;
      if (b.categoria === 'LUCROS') return 1;
      return b.total - a.total; // Ordena por total decrescente
    });

    const totalParaPorcentagem = relatorio.totalGanhos + relatorio.totalGastos;
    
    for (const resumo of categoriasOrdenadas) {
      const porcentagem = totalParaPorcentagem > 0 
        ? (resumo.total / totalParaPorcentagem) * 100 
        : 0;
      const emoji = resumo.categoria === 'LUCROS' ? '💰' : '💸';
      const label = resumo.categoria === 'LUCROS' ? 'LUCROS (ganhos)' : resumo.categoria;
      mensagem += `\n${emoji} ${label}: ${formatarMoeda(resumo.total)} (${resumo.quantidade}x) - ${porcentagem.toFixed(1)}%`;
    }

    await ctx.reply(mensagem, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    await ctx.reply('❌ Erro ao gerar relatório. Tente novamente.');
  }
}

/**
 * Handler para comando /exportar
 */
export async function handleExportar(ctx: Context) {
  const texto = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
  const partes = texto.split(' ');

  if (partes.length < 2) {
    await ctx.reply(
      '⚠️ Use o formato: /exportar <mês>\n' +
      'Exemplo: /exportar agosto\n' +
      'Exemplo: /exportar agosto 2025'
    );
    return;
  }

  const mesNome = partes[1];
  const mes = parseMes(mesNome);

  if (!mes) {
    await ctx.reply(
      '⚠️ Mês inválido. Use o nome do mês em português.\n' +
      'Exemplo: janeiro, fevereiro, março, etc.'
    );
    return;
  }

  // Tenta extrair o ano se fornecido
  let ano = new Date().getFullYear();
  if (partes.length >= 3) {
    const anoFornecido = parseInt(partes[2]);
    if (!isNaN(anoFornecido) && anoFornecido > 2000 && anoFornecido < 2100) {
      ano = anoFornecido;
    }
  }

  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) {
    await ctx.reply('❌ Erro ao identificar usuário.');
    return;
  }

  try {
    // Obtém o usuário do banco
    const usuario = await obterUsuarioPorTelegramId(telegramUserId);
    if (!usuario) {
      await ctx.reply('⚠️ Você precisa usar /start primeiro para se registrar.');
      return;
    }

    await ctx.reply('📊 Gerando arquivo Excel...');

    // Gera o arquivo Excel
    const resultado = await gerarExcelTransacoes(usuario.id, mes, ano);

    if (!resultado) {
      await ctx.reply(
        `📊 Nenhuma transação encontrada para ${mesNome} de ${ano}.\n` +
        `Não é possível gerar arquivo sem transações.`
      );
      return;
    }

    // Envia o arquivo
    await ctx.replyWithDocument(
      {
        source: resultado.caminhoArquivo,
        filename: resultado.nomeArquivo,
      },
      {
        caption: `📊 *Relatório de ${mesNome} de ${ano}*\n\n` +
          `✅ Arquivo Excel gerado com sucesso!\n` +
          `📁 ${resultado.nomeArquivo}`,
        parse_mode: 'Markdown',
      }
    );

    // Deleta o arquivo após enviar (opcional, mas já será deletado pela limpeza automática)
    // Podemos deixar a limpeza automática cuidar disso
  } catch (error: any) {
    console.error('Erro ao exportar transações:', error);

    if (error.message === 'ARQUIVO_MUITO_GRANDE') {
      await ctx.reply(
        '❌ *Erro ao gerar arquivo*\n\n' +
        'O relatório do mês selecionado é muito grande (maior que 50MB).\n' +
        'Por favor, tente exportar um período menor ou entre em contato com o suporte.',
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply('❌ Erro ao gerar arquivo Excel. Tente novamente.');
    }
  }
}

/**
 * Handler para mensagens de texto (gastos)
 */
export async function handleGasto(ctx: Context) {
  const telegramUserId = ctx.from?.id;
  const texto = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

  if (!telegramUserId || !texto) {
    return;
  }

  // Ignora comandos
  if (texto.startsWith('/')) {
    return;
  }

  // Verifica se o usuário está registrado
  let usuario = await obterUsuarioPorTelegramId(telegramUserId);
  if (!usuario) {
    // Tenta criar o usuário automaticamente
    if (ctx.from) {
      usuario = await criarOuObterUsuario({
        id: ctx.from.id,
        first_name: ctx.from.first_name,
        last_name: ctx.from.last_name,
        username: ctx.from.username,
        language_code: ctx.from.language_code,
      });
    } else {
      await ctx.reply('⚠️ Erro ao identificar usuário. Use /start primeiro.');
      return;
    }
  }

  await ctx.reply('🤔 Analisando sua transação...');

  try {
    // Categoriza o gasto usando Ollama
    const gastoCategorizado = await categorizarGasto(texto);

    if (!gastoCategorizado) {
      await ctx.reply(
        '❌ Não consegui categorizar sua transação.\n\n' +  
        'Por favor, escolha uma categoria:\n' +
        '1️⃣ TRANSPORTE\n' +
        '2️⃣ LAZER\n' +
        '3️⃣ SAUDE\n' +
        '4️⃣ MORADIA\n' +
        '5️⃣ ESTUDOS\n' +
        '6️⃣ LUCROS (ganhos)'
      );
      return;
    }

    const dataGasto = parseData(texto);

    // Salva estado de confirmação pendente (usa telegramUserId como key)
    confirmacoesPendentes.set(telegramUserId, {
      userId: usuario.id, // ID interno do banco
      valor: gastoCategorizado.valor,
      categoria: gastoCategorizado.categoria,
      descricao: gastoCategorizado.descricao,
      dataGasto,
      nota: gastoCategorizado.nota,
    });

    // Determina se é ganho ou gasto
    const ehGanho = gastoCategorizado.categoria === 'LUCROS';
    const tipoTransacao = ehGanho ? 'Ganho' : 'Gasto';
    const emojiTipo = ehGanho ? '💰' : '💸';

    // Formata mensagem de confirmação
    let mensagemConfirmacao = `${emojiTipo} *${tipoTransacao} identificado:*\n\n`;
    mensagemConfirmacao += `💰 Valor: ${formatarMoeda(gastoCategorizado.valor)}\n`;
    mensagemConfirmacao += `📂 Categoria: ${gastoCategorizado.categoria}`;
    if (ehGanho) {
      mensagemConfirmacao += ` (ganho)`;
    }
    mensagemConfirmacao += `\n`;
    mensagemConfirmacao += `📝 Descrição: ${gastoCategorizado.descricao}\n`;
    mensagemConfirmacao += `📅 Data: ${formatarData(dataGasto)}\n`;
    if (gastoCategorizado.nota) {
      mensagemConfirmacao += `📌 Nota: ${gastoCategorizado.nota}\n`;
    }
    mensagemConfirmacao += `\n❓ *Confirma para salvar?*\n\n`;
    mensagemConfirmacao += `Responda: *sim* ou *não*\n`;
    mensagemConfirmacao += `Ou escolha outra categoria digitando o número:\n`;
    mensagemConfirmacao += `1️⃣ TRANSPORTE | 2️⃣ LAZER | 3️⃣ SAUDE\n`;
    mensagemConfirmacao += `4️⃣ MORADIA | 5️⃣ ESTUDOS | 6️⃣ LUCROS (ganhos)`;

    await ctx.reply(mensagemConfirmacao, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Erro ao processar gasto:', error);
    await ctx.reply('❌ Erro ao processar seu gasto. Tente novamente.');
  }
}

/**
 * Handler para confirmação de gasto
 */
export async function handleConfirmacao(ctx: Context) {
  const userId = ctx.from?.id;
  const texto = ctx.message && 'text' in ctx.message ? ctx.message.text?.toLowerCase().trim() : '';

  if (!userId || !texto) {
    return;
  }

  const confirmacao = confirmacoesPendentes.get(userId);

  if (!confirmacao) {
    // Não há confirmação pendente, trata como gasto novo
    await handleGasto(ctx);
    return;
  }

  // Mapeamento de números para categorias
  const categoriaMap: Record<string, string> = {
    '1': 'TRANSPORTE',
    '2': 'LAZER',
    '3': 'SAUDE',
    '4': 'MORADIA',
    '5': 'ESTUDOS',
    '6': 'LUCROS',
  };

  // Se digitou um número, altera a categoria
  if (categoriaMap[texto]) {
    confirmacao.categoria = categoriaMap[texto];
    confirmacoesPendentes.set(userId, confirmacao);

    let mensagem = `✅ *Categoria alterada para: ${confirmacao.categoria}*\n\n`;
    mensagem += `💰 Valor: ${formatarMoeda(confirmacao.valor)}\n`;
    mensagem += `📝 Descrição: ${confirmacao.descricao}\n`;
    mensagem += `📅 Data: ${formatarData(confirmacao.dataGasto)}\n`;
    mensagem += `\n❓ *Confirma para salvar?* (sim/não)`;

    await ctx.reply(mensagem, { parse_mode: 'Markdown' });
    return;
  }

  // Confirmação: sim ou não
  if (texto === 'sim' || texto === 's' || texto === 'confirmar' || texto === 'confirmo') {
    try {
      // Usa o userId interno do banco (não o Telegram ID)
      await criarTransacao(
        confirmacao.userId, // ID interno do banco
        confirmacao.valor,
        confirmacao.categoria,
        confirmacao.descricao,
        confirmacao.dataGasto,
        confirmacao.nota
      );

      confirmacoesPendentes.delete(userId);

      const ehGanho = confirmacao.categoria === 'LUCROS';
      const tipoTransacao = ehGanho ? 'Ganho' : 'Gasto';
      const emojiTipo = ehGanho ? '💰' : '💸';

      await ctx.reply(
        `✅ *${tipoTransacao} salvo com sucesso!*\n\n` +
        `${emojiTipo} ${formatarMoeda(confirmacao.valor)} - ${confirmacao.categoria}\n` +
        `📅 ${formatarData(confirmacao.dataGasto)}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      await ctx.reply('❌ Erro ao salvar gasto. Tente novamente.');
    }
  } else if (texto === 'não' || texto === 'nao' || texto === 'n' || texto === 'cancelar') {
    confirmacoesPendentes.delete(userId);
    await ctx.reply('❌ Transação cancelada.');
  } else {
    // Resposta não reconhecida, mantém pendente
    await ctx.reply(
      '⚠️ Por favor, responda *sim* ou *não*, ou escolha uma categoria (1-6).',
      { parse_mode: 'Markdown' }
    );
  }
}
