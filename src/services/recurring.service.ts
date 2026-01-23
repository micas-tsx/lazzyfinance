import { prisma } from '../database/client';
import { Categoria } from '@prisma/client';

/**
 * Cria um gasto fixo recorrente
 * Cap de dia 28 para evitar problemas com meses diferentes
 */
export async function criarGastoFixo(
  userId: string,
  valor: number,
  categoria: string,
  descricao: string,
  diaDoMes: number,
  nota?: string
): Promise<{ id: string; diaAjustado: number }> {
  const categoriaEnum = categoria.toUpperCase() as Categoria;
  
  // Cap de dia 28
  const diaAjustado = Math.min(diaDoMes, 28);

  const recurring = await prisma.recurringTransaction.create({
    data: {
      userId,
      valor,
      categoria: categoriaEnum,
      descricao,
      diaDoMes: diaAjustado,
      nota: nota || null,
      ativo: true,
    },
  });

  return { id: recurring.id, diaAjustado };
}

/**
 * Lista todos os gastos fixos ativos de um usuário
 */
export async function listarGastosFixos(userId: string) {
  const gastos = await prisma.recurringTransaction.findMany({
    where: {
      userId,
      ativo: true,
    },
    orderBy: {
      diaDoMes: 'asc',
    },
  });

  return gastos;
}

/**
 * Busca gastos fixos ativos para um dia específico
 * Usado pelo scheduler para enviar confirmações
 */
export async function buscarGastosFixosPorDia(diaDoMes: number) {
  const gastos = await prisma.recurringTransaction.findMany({
    where: {
      diaDoMes,
      ativo: true,
    },
    include: {
      user: {
        select: {
          telegramId: true,
          firstName: true,
        },
      },
    },
  });

  return gastos;
}

/**
 * Atualiza um gasto fixo
 */
export async function atualizarGastoFixo(
  id: string,
  userId: string,
  dados: {
    valor?: number;
    categoria?: string;
    descricao?: string;
    diaDoMes?: number;
    nota?: string;
  }
): Promise<boolean> {
  // Cap de dia 28 se fornecido
  const diaAjustado = dados.diaDoMes ? Math.min(dados.diaDoMes, 28) : undefined;
  
  const categoriaEnum = dados.categoria ? (dados.categoria.toUpperCase() as Categoria) : undefined;

  const updated = await prisma.recurringTransaction.updateMany({
    where: {
      id,
      userId, // Garante que só atualiza se for do usuário
    },
    data: {
      ...(dados.valor !== undefined && { valor: dados.valor }),
      ...(categoriaEnum && { categoria: categoriaEnum }),
      ...(dados.descricao && { descricao: dados.descricao }),
      ...(diaAjustado && { diaDoMes: diaAjustado }),
      ...(dados.nota !== undefined && { nota: dados.nota }),
    },
  });

  return updated.count > 0;
}

/**
 * Desativa (cancela) um gasto fixo
 * Não deleta, apenas marca como inativo
 */
export async function desativarGastoFixo(id: string, userId: string): Promise<boolean> {
  const updated = await prisma.recurringTransaction.updateMany({
    where: {
      id,
      userId, // Garante que só desativa se for do usuário
    },
    data: {
      ativo: false,
    },
  });

  return updated.count > 0;
}

/**
 * Busca um gasto fixo específico
 */
export async function buscarGastoFixoPorId(id: string, userId: string) {
  const gasto = await prisma.recurringTransaction.findFirst({
    where: {
      id,
      userId,
    },
  });

  return gasto;
}
