import { prisma } from '../database/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Duração de validade do token em horas (7 dias)
 */
const TOKEN_EXPIRATION_HOURS = 24 * 7;

/**
 * Gera um token único para acesso ao dashboard web
 * @param userId ID interno do usuário no banco
 * @returns Token gerado
 */
export async function gerarTokenAcesso(userId: string): Promise<string> {
  console.log(`[TOKEN SERVICE] Gerando token para usuário ${userId}`);
  
  // Gera token único
  const token = uuidv4();
  
  // Calcula data de expiração
  const expiraEm = new Date();
  expiraEm.setHours(expiraEm.getHours() + TOKEN_EXPIRATION_HOURS);
  
  console.log(`[TOKEN SERVICE] Token gerado: ${token.substring(0, 8)}... (expira em ${expiraEm.toISOString()})`);
  
  // Salva no banco
  await prisma.accessToken.create({
    data: {
      userId,
      token,
      expiraEm,
    },
  });
  
  return token;
}

/**
 * Valida um token e retorna o usuário associado
 * @param token Token a ser validado
 * @returns ID do usuário se válido, null caso contrário
 */
export async function validarToken(token: string): Promise<string | null> {
  console.log(`[TOKEN SERVICE] Validando token: ${token.substring(0, 8)}...`);
  
  const accessToken = await prisma.accessToken.findUnique({
    where: { token },
    include: { user: true },
  });
  
  if (!accessToken) {
    console.log(`[TOKEN SERVICE] Token não encontrado: ${token.substring(0, 8)}...`);
    return null;
  }
  
  // Verifica se expirou
  if (new Date() > accessToken.expiraEm) {
    console.log(`[TOKEN SERVICE] Token expirado: ${token.substring(0, 8)}...`);
    // Remove token expirado
    await prisma.accessToken.delete({ where: { token } });
    return null;
  }
  
  // Marca como usado (atualiza usadoEm)
  await prisma.accessToken.update({
    where: { token },
    data: { usadoEm: new Date() },
  });
  
  console.log(`[TOKEN SERVICE] Token válido para usuário ${accessToken.userId}`);
  return accessToken.userId;
}

/**
 * Remove tokens expirados do banco
 */
export async function limparTokensExpirados(): Promise<number> {
  console.log('[TOKEN SERVICE] Limpando tokens expirados...');
  
  const agora = new Date();
  const resultado = await prisma.accessToken.deleteMany({
    where: {
      expiraEm: {
        lt: agora,
      },
    },
  });
  
  console.log(`[TOKEN SERVICE] ${resultado.count} tokens expirados removidos`);
  return resultado.count;
}

/**
 * Revoga um token específico (remove do banco)
 */
export async function revogarToken(token: string): Promise<boolean> {
  console.log(`[TOKEN SERVICE] Revogando token: ${token.substring(0, 8)}...`);
  
  try {
    await prisma.accessToken.delete({ where: { token } });
    console.log(`[TOKEN SERVICE] Token revogado com sucesso`);
    return true;
  } catch (error) {
    console.error(`[TOKEN SERVICE] Erro ao revogar token:`, error);
    return false;
  }
}

/**
 * Obtém ou gera um novo token para o usuário
 * Remove tokens antigos não expirados do mesmo usuário
 */
export async function obterOuGerarToken(userId: string): Promise<string> {
  console.log(`[TOKEN SERVICE] Obtendo ou gerando token para usuário ${userId}`);
  
  // Busca tokens válidos do usuário
  const tokensValidos = await prisma.accessToken.findMany({
    where: {
      userId,
      expiraEm: {
        gt: new Date(),
      },
    },
    orderBy: {
      criadoEm: 'desc',
    },
  });
  
  // Se já tem um token válido, retorna o mais recente
  if (tokensValidos.length > 0) {
    console.log(`[TOKEN SERVICE] Token existente encontrado, reutilizando`);
    return tokensValidos[0].token;
  }
  
  // Gera novo token
  console.log(`[TOKEN SERVICE] Nenhum token válido encontrado, gerando novo`);
  return await gerarTokenAcesso(userId);
}
