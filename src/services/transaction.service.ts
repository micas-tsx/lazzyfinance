import { prisma } from '../database/client';
import { Categoria } from '@prisma/client';
import { GastoCategorizado } from './ollama.service';

/**
 * Salva uma transação no banco de dados
 * IMPORTANTE: Sempre requer userId para garantir isolamento de dados
 */
export async function criarTransacao(
  userId: string,
  valor: number,
  categoria: string,
  descricao: string,
  dataGasto: Date,
  nota?: string
): Promise<{ id: string }> {
  const categoriaEnum = categoria.toUpperCase() as Categoria;

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      valor,
      categoria: categoriaEnum,
      descricao,
      dataGasto,
      nota: nota || null,
    },
  });

  return { id: transaction.id };
}

/**
 * Busca transações de um mês específico para um usuário
 * IMPORTANTE: Sempre filtra por userId para garantir isolamento
 */
export async function buscarTransacoesPorMes(userId: string, mes: number, ano: number) {
  const inicioMes = new Date(ano, mes - 1, 1);
  const fimMes = new Date(ano, mes, 0, 23, 59, 59);

  const transacoes = await prisma.transaction.findMany({
    where: {
      userId, // CRÍTICO: Filtro por usuário
      dataGasto: {
        gte: inicioMes,
        lte: fimMes,
      },
    },
    orderBy: {
      dataGasto: 'desc',
    },
  });

  return transacoes;
}

/**
 * Gera relatório agregado por categoria para um mês
 * IMPORTANTE: Sempre filtra por userId para garantir isolamento
 */
export async function gerarRelatorioMensal(userId: string, mes: number, ano: number) {
  const transacoes = await buscarTransacoesPorMes(userId, mes, ano);

  // Separa ganhos e gastos
  const ganhos = transacoes.filter(t => t.categoria === 'LUCROS');
  const gastos = transacoes.filter(t => t.categoria !== 'LUCROS');

  // Calcula totais
  const totalGanhos = ganhos.reduce((sum, t) => sum + Number(t.valor), 0);
  const totalGastos = gastos.reduce((sum, t) => sum + Number(t.valor), 0);
  const saldoLiquido = totalGanhos - totalGastos;

  // Agrupa por categoria e soma valores
  const resumoPorCategoria = transacoes.reduce((acc, transacao) => {
    const categoria = transacao.categoria;
    if (!acc[categoria]) {
      acc[categoria] = {
        categoria,
        total: 0,
        quantidade: 0,
        transacoes: [],
      };
    }
    acc[categoria].total += Number(transacao.valor);
    acc[categoria].quantidade += 1;
    acc[categoria].transacoes.push(transacao);
    return acc;
  }, {} as Record<Categoria, { categoria: Categoria; total: number; quantidade: number; transacoes: typeof transacoes }>);

  return {
    mes,
    ano,
    totalGanhos,
    totalGastos,
    saldoLiquido,
    quantidadeTransacoes: transacoes.length,
    quantidadeGanhos: ganhos.length,
    quantidadeGastos: gastos.length,
    resumoPorCategoria: Object.values(resumoPorCategoria),
    transacoes,
  };
}

/**
 * Busca últimas N transações de um usuário
 * Útil para listar transações recentes para edição
 */
export async function buscarUltimasTransacoes(userId: string, limite: number = 5) {
  const transacoes = await prisma.transaction.findMany({
    where: {
      userId,
    },
    orderBy: {
      dataGasto: 'desc',
    },
    take: limite,
  });

  return transacoes;
}

/**
 * Busca uma transação específica por ID
 */
export async function buscarTransacaoPorId(id: string, userId: string) {
  const transacao = await prisma.transaction.findFirst({
    where: {
      id,
      userId, // Garante isolamento
    },
  });

  return transacao;
}

/**
 * Atualiza uma transação existente
 * IMPORTANTE: Sempre valida userId para garantir isolamento
 */
export async function atualizarTransacao(
  id: string,
  userId: string,
  dados: {
    valor?: number;
    categoria?: string;
    descricao?: string;
    dataGasto?: Date;
    nota?: string;
  }
): Promise<boolean> {
  const categoriaEnum = dados.categoria ? (dados.categoria.toUpperCase() as Categoria) : undefined;

  const updated = await prisma.transaction.updateMany({
    where: {
      id,
      userId, // CRÍTICO: Garante que só atualiza se for do usuário
    },
    data: {
      ...(dados.valor !== undefined && { valor: dados.valor }),
      ...(categoriaEnum && { categoria: categoriaEnum }),
      ...(dados.descricao && { descricao: dados.descricao }),
      ...(dados.dataGasto && { dataGasto: dados.dataGasto }),
      ...(dados.nota !== undefined && { nota: dados.nota }),
    },
  });

  return updated.count > 0;
}

/**
 * Deleta uma transação
 * IMPORTANTE: Sempre valida userId para garantir isolamento
 */
export async function deletarTransacao(id: string, userId: string): Promise<boolean> {
  const deleted = await prisma.transaction.deleteMany({
    where: {
      id,
      userId, // CRÍTICO: Garante que só deleta se for do usuário
    },
  });

  return deleted.count > 0;
}

