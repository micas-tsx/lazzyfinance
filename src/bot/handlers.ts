import { Context } from 'telegraf';
import { categorizarGasto } from '../services/ollama.service';
import { 
  criarTransacao, 
  gerarRelatorioMensal, 
  buscarUltimasTransacoes,
  atualizarTransacao,
  buscarTransacaoPorId 
} from '../services/transaction.service';
import { criarOuObterUsuario, obterUsuarioPorTelegramId } from '../services/user.service';
import { parseData, formatarData, formatarMoeda, parseMes } from '../utils/dateParser';
import { gerarExcelTransacoes } from '../services/export.service';
import { obterOuGerarToken } from '../services/token.service';
import {
  criarGastoFixo,
  listarGastosFixos,
  atualizarGastoFixo,
  desativarGastoFixo,
  buscarGastoFixoPorId
} from '../services/recurring.service';
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

// Estado para criar gastos fixos
interface GastoFixoPendente {
  userId: string; // ID interno do usuário no banco
  valor: number;
  categoria: string;
  descricao: string;
  nota?: string;
  aguardandoDia: boolean;
}

// Estado para editar transações
interface EdicaoPendente {
  userId: string;
  transacaoId: string;
  aguardandoCampo: 'campo' | 'valor' | 'categoria' | 'descricao' | 'data' | 'nota' | null;
  campoEscolhido?: string;
}

const confirmacoesPendentes = new Map<number, ConfirmacaoPendente>(); // Key: Telegram ID
const gastosFixosPendentes = new Map<number, GastoFixoPendente>();
const edicoesPendentes = new Map<number, EdicaoPendente>();

/**
 * Verifica se há confirmação pendente para um usuário
 */
export function temConfirmacaoPendente(userId: number): boolean {
  return confirmacoesPendentes.has(userId);
}

/**
 * Verifica se há gasto fixo pendente para um usuário
 */
export function temGastoFixoPendente(userId: number): boolean {
  return gastosFixosPendentes.has(userId);
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
      `📝 Para registrar um GASTO, envie uma mensagem como:\n` +
      `• "gastei 50 reais no mercado"\n` +
      `• "gastei 100 reais de uber hoje"\n` +
      `• "gastei 200 reais de aluguel em 01/01/2025"\n\n` +
      `💰 Para registrar um GANHO, envie uma mensagem como:\n` +
      `• "ganhei 1500 reais de salário"\n` +
      `• "lucrei 500 reais que recebi de freela"\n` +
      `• "lucrei 200 reais de venda hoje"\n\n` +
      `🔄 Gastos Fixos (NOVO)\n` +
      `• /fixo - Criar gasto fixo mensal\n` +
      `• /meu_fixos - Ver gastos fixos cadastrados\n\n` +
      `📊 Use /relatorio (mês) para ver o relatório mensal\n` +
      `Exemplo: /relatorio agosto\n\n` +
      `✏️ Use /editar para editar suas últimas transações\n\n` +
      `📥 Use /exportar (mês) para exportar em Excel\n` +
      `Exemplo: /exportar agosto\n\n` +
      `🌐 Use /site para acessar seu dashboard web`
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
        '1️⃣ ALIMENTACAO\n' +
        '2️⃣ TRANSPORTE\n' +
        '3️⃣ LAZER\n' +
        '4️⃣ SAUDE\n' +
        '5️⃣ MORADIA\n' +
        '6️⃣ ESTUDOS\n' +
        '7️⃣ TRABALHO\n' +
        '8️⃣ LUCROS (ganhos)'
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
    mensagemConfirmacao += `1️⃣ ALIMENTACAO | 2️⃣ TRANSPORTE | 3️⃣ LAZER\n`;
    mensagemConfirmacao += `4️⃣ SAUDE | 5️⃣ MORADIA | 6️⃣ ESTUDOS\n`;
    mensagemConfirmacao += `7️⃣ TRABALHO | 8️⃣ LUCROS (ganhos)`;

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
    '1': 'ALIMENTACAO',
    '2': 'TRANSPORTE',
    '3': 'LAZER',
    '4': 'SAUDE',
    '5': 'MORADIA',
    '6': 'ESTUDOS',
    '7': 'TRABALHO',
    '8': 'LUCROS',
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
      '⚠️ Por favor, responda *sim* ou *não*, ou escolha uma categoria (1-8).',
      { parse_mode: 'Markdown' }
    );
  }
}

/**
 * Handler para comando /fixo
 * Cria um novo gasto fixo recorrente
 */
export async function handleFixo(ctx: Context) {
  const telegramUserId = ctx.from?.id;
  const texto = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

  if (!telegramUserId) {
    await ctx.reply('❌ Erro ao identificar usuário.');
    return;
  }

  // Verifica se o usuário está registrado
  const usuario = await obterUsuarioPorTelegramId(telegramUserId);
  if (!usuario) {
    await ctx.reply('⚠️ Você precisa usar /start primeiro para se registrar.');
    return;
  }

  // Se já tem estado pendente, trata como continuação do fluxo
  const pendente = gastosFixosPendentes.get(telegramUserId);
  if (pendente) {
    await handleFluxoFixo(ctx);
    return;
  }

  // Cria estado pendente inicial para marcar que está no fluxo de criação de gasto fixo
  gastosFixosPendentes.set(telegramUserId, {
    userId: usuario.id,
    valor: 0,
    categoria: '',
    descricao: '',
    aguardandoDia: false,
  });

  await ctx.reply(
    '📌 *Criar Gasto Fixo Recorrente*\n\n' +
    'Gastos fixos são despesas que se repetem *todo mês* no mesmo dia.\n\n' +
    '🔔 Você receberá uma notificação no dia escolhido e poderá confirmar ou pular.\n\n' +
    'Envie o valor e descrição do gasto fixo:\n\n' +
    '*Exemplos:*\n' +
    '• "1500 aluguel"\n' +
    '• "150 internet"\n' +
    '• "80 assinatura netflix"',
    { parse_mode: 'Markdown' }
  );
}

/**
 * Fluxo conversacional para criar gasto fixo
 */
export async function handleFluxoFixo(ctx: Context) {
  const telegramUserId = ctx.from?.id;
  const texto = ctx.message && 'text' in ctx.message ? ctx.message.text?.toLowerCase().trim() : '';

  if (!telegramUserId || !texto) {
    return;
  }

  const usuario = await obterUsuarioPorTelegramId(telegramUserId);
  if (!usuario) {
    return;
  }

  const pendente = gastosFixosPendentes.get(telegramUserId);

  // Se não tem estado pendente, erro (não deveria acontecer)
  if (!pendente) {
    await ctx.reply('❌ Erro: use /fixo para iniciar a criação de um gasto fixo.');
    return;
  }

  // Se está no estado inicial (valor = 0), significa que está aguardando a descrição do gasto
  if (pendente.valor === 0 && !pendente.aguardandoDia) {
    await ctx.reply('🤔 Analisando gasto fixo...');

    try {
      // Categoriza usando Ollama
      const gastoCategorizado = await categorizarGasto(texto);

      if (!gastoCategorizado) {
        await ctx.reply(
          '❌ Não consegui categorizar. Por favor, escolha uma categoria:\n' +
          '1️⃣ ALIMENTACAO | 2️⃣ TRANSPORTE | 3️⃣ LAZER\n' +
          '4️⃣ SAUDE | 5️⃣ MORADIA | 6️⃣ ESTUDOS\n' +
          '7️⃣ TRABALHO | 8️⃣ LUCROS (ganhos)'
        );
        return;
      }

      // Salva estado pendente
      gastosFixosPendentes.set(telegramUserId, {
        userId: usuario.id,
        valor: gastoCategorizado.valor,
        categoria: gastoCategorizado.categoria,
        descricao: gastoCategorizado.descricao,
        nota: gastoCategorizado.nota,
        aguardandoDia: false,
      });

      let mensagem = `📌 *Gasto Fixo Recorrente*\n\n`;
      mensagem += `Este gasto será registrado *automaticamente todo mês* no dia que você escolher.\n\n`;
      mensagem += `💰 Valor: ${formatarMoeda(gastoCategorizado.valor)}\n`;
      mensagem += `📂 Categoria: ${gastoCategorizado.categoria}\n`;
      mensagem += `📝 Descrição: ${gastoCategorizado.descricao}\n`;
      if (gastoCategorizado.nota) {
        mensagem += `📌 Nota: ${gastoCategorizado.nota}\n`;
      }
      mensagem += `\n❓ *Confirma para continuar?*\n\n`;
      mensagem += `Responda: *sim* ou *não*\n`;
      mensagem += `Ou escolha outra categoria (1-8)`;

      await ctx.reply(mensagem, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Erro ao processar gasto fixo:', error);
      gastosFixosPendentes.delete(telegramUserId);
      await ctx.reply('❌ Erro ao processar. Use /fixo para tentar novamente.');
    }
    return;
  }

  // Se aguardando confirmação da categoria
  if (!pendente.aguardandoDia) {
    // Mapeamento de números para categorias
    const categoriaMap: Record<string, string> = {
      '1': 'ALIMENTACAO',
      '2': 'TRANSPORTE',
      '3': 'LAZER',
      '4': 'SAUDE',
      '5': 'MORADIA',
      '6': 'ESTUDOS',
      '7': 'TRABALHO',
      '8': 'LUCROS',
    };

    // Se digitou um número, altera a categoria
    if (categoriaMap[texto]) {
      pendente.categoria = categoriaMap[texto];
      gastosFixosPendentes.set(telegramUserId, pendente);

      let mensagem = `✅ *Categoria alterada para: ${pendente.categoria}*\n\n`;
      mensagem += `💰 Valor: ${formatarMoeda(pendente.valor)}\n`;
      mensagem += `📝 Descrição: ${pendente.descricao}\n`;
      mensagem += `\n❓ *Confirma?* (sim/não)`;

      await ctx.reply(mensagem, { parse_mode: 'Markdown' });
      return;
    }

    // Confirmação
    if (texto === 'sim' || texto === 's' || texto === 'confirmar' || texto === 'confirmo') {
      pendente.aguardandoDia = true;
      gastosFixosPendentes.set(telegramUserId, pendente);

      await ctx.reply(
        '📅 *Qual dia do mês?*\n\n' +
        'Digite um número de 1 a 31.\n' +
        '⚠️ Se escolher acima de 28, será ajustado para o dia 28 automaticamente.',
        { parse_mode: 'Markdown' }
      );
      return;
    } else if (texto === 'não' || texto === 'nao' || texto === 'n' || texto === 'cancelar') {
      gastosFixosPendentes.delete(telegramUserId);
      await ctx.reply('❌ Criação de gasto fixo cancelada.');
      return;
    }
  }

  // Se aguardando dia do mês
  if (pendente.aguardandoDia) {
    const dia = parseInt(texto);
    if (isNaN(dia) || dia < 1 || dia > 31) {
      await ctx.reply('⚠️ Por favor, digite um número válido entre 1 e 31.');
      return;
    }

    try {
      const resultado = await criarGastoFixo(
        pendente.userId,
        pendente.valor,
        pendente.categoria,
        pendente.descricao,
        dia,
        pendente.nota
      );

      gastosFixosPendentes.delete(telegramUserId);

      let mensagem = `✅ Gasto Fixo Recorrente criado!\n\n`;
      mensagem += `💰 ${formatarMoeda(pendente.valor)} - ${pendente.categoria}\n`;
      mensagem += `📝 ${pendente.descricao}\n`;
      mensagem += `📅 Repetir todo dia ${resultado.diaAjustado} do mês\n\n`;
      
      if (resultado.diaAjustado !== dia) {
        mensagem += `⚠️ Ajustado para dia 28 (evita problemas em meses curtos)\n\n`;
      }
      
      mensagem += `🔔 Como funciona:\n`;
      mensagem += `• Todo dia ${resultado.diaAjustado}, às 9h, você receberá uma mensagem\n`;
      mensagem += `• Você pode confirmar (sim) ou pular (não) naquele mês\n`;
      mensagem += `• Use /meu_fixos para ver todos os gastos fixos ativos`;

      await ctx.reply(mensagem);
    } catch (error) {
      console.error('Erro ao criar gasto fixo:', error);
      await ctx.reply('❌ Erro ao salvar gasto fixo. Tente novamente.');
    }
  }
}

/**
 * Handler para comando /meu_fixos
 * Lista gastos fixos do usuário
 */
export async function handleMeuFixos(ctx: Context) {
  const telegramUserId = ctx.from?.id;

  if (!telegramUserId) {
    await ctx.reply('❌ Erro ao identificar usuário.');
    return;
  }

  const usuario = await obterUsuarioPorTelegramId(telegramUserId);
  if (!usuario) {
    await ctx.reply('⚠️ Você precisa usar /start primeiro para se registrar.');
    return;
  }

  try {
    const gastos = await listarGastosFixos(usuario.id);

    if (gastos.length === 0) {
      await ctx.reply(
        '📌 Você não tem gastos fixos cadastrados.\n\n' +
        'Use /fixo para criar um novo gasto fixo.'
      );
      return;
    }

    let mensagem = `📌 *Seus Gastos Fixos:*\n\n`;

    for (const gasto of gastos) {
      mensagem += `💰 ${formatarMoeda(Number(gasto.valor))} - ${gasto.categoria}\n`;
      mensagem += `   📝 ${gasto.descricao}\n`;
      mensagem += `   📅 Todo dia ${gasto.diaDoMes}\n`;
      mensagem += `   🆔 ID: \`${gasto.id}\`\n\n`;
    }

    mensagem += `\n*Gerenciar:*\n`;
    mensagem += `• /fixo_editar <ID> - Editar\n`;
    mensagem += `• /fixo_cancelar <ID> - Desativar`;

    await ctx.reply(mensagem, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Erro ao listar gastos fixos:', error);
    await ctx.reply('❌ Erro ao listar gastos fixos. Tente novamente.');
  }
}

/**
 * Handler para comando /editar
 * Edita uma transação existente
 */
export async function handleEditar(ctx: Context) {
  const telegramUserId = ctx.from?.id;

  if (!telegramUserId) {
    await ctx.reply('❌ Erro ao identificar usuário.');
    return;
  }

  const usuario = await obterUsuarioPorTelegramId(telegramUserId);
  if (!usuario) {
    await ctx.reply('⚠️ Você precisa usar /start primeiro para se registrar.');
    return;
  }

  try {
    // Busca últimas 5 transações
    const transacoes = await buscarUltimasTransacoes(usuario.id, 5);

    if (transacoes.length === 0) {
      await ctx.reply('📝 Você não tem transações para editar.');
      return;
    }

    let mensagem = `📝 *Suas últimas transações:*\n\n`;

    transacoes.forEach((t, index) => {
      const emoji = t.categoria === 'LUCROS' ? '💰' : '💸';
      mensagem += `${index + 1}️⃣ ${emoji} ${formatarMoeda(Number(t.valor))} - ${t.categoria}\n`;
      mensagem += `   📝 ${t.descricao}\n`;
      mensagem += `   📅 ${formatarData(t.dataGasto)}\n`;
      mensagem += `   🆔 \`${t.id}\`\n\n`;
    });

    mensagem += `\n*Qual deseja editar?*\n`;
    mensagem += `Digite o número (1-${transacoes.length})`;

    await ctx.reply(mensagem, { parse_mode: 'Markdown' });

    // Aguarda escolha do usuário (implementar próxima interação)
  } catch (error) {
    console.error('Erro ao listar transações:', error);
    await ctx.reply('❌ Erro ao buscar transações. Tente novamente.');
  }
}

/**
 * Handler para comando /testar_fixos
 * Executa o scheduler de gastos fixos manualmente (útil para testes)
 */
export async function handleTestarFixos(ctx: Context, bot: any) {
  const telegramUserId = ctx.from?.id;

  if (!telegramUserId) {
    await ctx.reply('❌ Erro ao identificar usuário.');
    return;
  }

  const usuario = await obterUsuarioPorTelegramId(telegramUserId);
  if (!usuario) {
    await ctx.reply('⚠️ Você precisa usar /start primeiro para se registrar.');
    return;
  }

  await ctx.reply('🔄 Executando verificação de gastos fixos...');

  try {
    const { executarSchedulerManualmente } = await import('../scheduler/recurringScheduler');
    await executarSchedulerManualmente(bot);
    
    await ctx.reply(
      '✅ Verificação concluída!\n\n' +
      'Se houver gastos fixos para hoje, você receberá as confirmações agora.'
    );
  } catch (error) {
    console.error('Erro ao executar scheduler:', error);
    await ctx.reply('❌ Erro ao executar verificação. Tente novamente.');
  }
}

