import { prisma } from '../database/client';
import { User, Plan } from '@prisma/client';

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

/**
 * Cria ou obtém um usuário do Telegram
 * Se o usuário já existir, retorna o existente
 */
export async function criarOuObterUsuario(telegramUser: TelegramUser): Promise<User> {
  const telegramId = BigInt(telegramUser.id);

  // Tenta encontrar usuário existente
  const usuarioExistente = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (usuarioExistente) {
    // Atualiza informações caso tenham mudado
    return await prisma.user.update({
      where: { telegramId },
      data: {
        firstName: telegramUser.first_name || null,
        lastName: telegramUser.last_name || null,
        username: telegramUser.username || null,
        languageCode: telegramUser.language_code || null,
      },
    });
  }

  // Cria novo usuário
  return await prisma.user.create({
    data: {
      telegramId,
      firstName: telegramUser.first_name || null,
      lastName: telegramUser.last_name || null,
      username: telegramUser.username || null,
      languageCode: telegramUser.language_code || null,
    },
  });
}

/**
 * Obtém um usuário pelo Telegram ID
 */
export async function obterUsuarioPorTelegramId(telegramId: number): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
  });
}

/**
 * Obtém um usuário pelo ID interno
 */
export async function obterUsuarioPorId(userId: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { id: userId },
  });
}

/**
 * Atualiza o plano de um usuário
 */
export async function atualizarPlanoUsuario(
  userId: string,
  plano: Plan,
  premiumUntil?: Date,
  stripeCustomerId?: string
): Promise<User> {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      plan: plano,
      premiumUntil: premiumUntil || null,
      ...(stripeCustomerId && { stripeCustomerId }),
    },
  });
}

/**
 * Verifica se o usuário tem uma assinatura PRO ativa
 */
export async function temPlanoPro(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, premiumUntil: true },
  });

  if (!user || user.plan !== Plan.PRO) {
    return false;
  }

  // Se premiumUntil estiver definido, verifica se expirou
  if (user.premiumUntil && user.premiumUntil < new Date()) {
    // Aqui poderíamos automaticamente rebaixar o usuário para FREE
    // mas por enquanto apenas retornamos false
    return false;
  }

  return true;
}
