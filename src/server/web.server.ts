import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env } from '../config/env';
import { validarToken, limparTokensExpirados } from '../services/token.service';
import { obterUsuarioPorId } from '../services/user.service';
import { 
  buscarTransacoesPorMes, 
  gerarRelatorioMensal, 
  atualizarTransacao, 
  deletarTransacao 
} from '../services/transaction.service';
import { listarGastosFixos } from '../services/recurring.service';
import { Transaction } from '@prisma/client';

const app = express();

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3001'], // Permite ambas as portas
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Logging middleware para debug
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[WEB SERVER] ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

/**
 * Middleware de autenticação via token
 */
async function autenticarToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token as string;
  
  console.log(`[WEB SERVER] Tentativa de autenticação com token: ${token ? token.substring(0, 8) + '...' : 'não fornecido'}`);
  
  if (!token) {
    console.log(`[WEB SERVER] Token não fornecido`);
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  const userId = await validarToken(token);
  
  if (!userId) {
    console.log(`[WEB SERVER] Token inválido ou expirado`);
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
  
  // Adiciona userId ao request para uso nos handlers
  (req as any).userId = userId;
  console.log(`[WEB SERVER] Autenticação bem-sucedida para usuário ${userId}`);
  next();
}

/**
 * GET /api/auth/validate
 * Valida se um token é válido
 */
app.get('/api/auth/validate', autenticarToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const usuario = await obterUsuarioPorId(userId);
    
    if (!usuario) {
      console.log(`[WEB SERVER] Usuário não encontrado: ${userId}`);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    console.log(`[WEB SERVER] Token validado com sucesso para usuário ${userId}`);
    res.json({
      valid: true,
      user: {
        id: usuario.id,
        firstName: usuario.firstName,
        lastName: usuario.lastName,
        username: usuario.username,
      },
    });
  } catch (error) {
    console.error('[WEB SERVER] Erro ao validar token:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/transactions
 * Retorna transações do usuário autenticado
 * Query params: mes (opcional), ano (opcional)
 */
app.get('/api/transactions', autenticarToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const mes = req.query.mes ? parseInt(req.query.mes as string) : new Date().getMonth() + 1;
    const ano = req.query.ano ? parseInt(req.query.ano as string) : new Date().getFullYear();
    
    console.log(`[WEB SERVER] Buscando transações para usuário ${userId} - mês ${mes}/${ano}`);
    
    const transacoes = await buscarTransacoesPorMes(userId, mes, ano);
    
    console.log(`[WEB SERVER] ${transacoes.length} transações encontradas`);
    
    // Formata transações para resposta
    const transacoesFormatadas = transacoes.map((t: Transaction) => ({
      id: t.id,
      valor: Number(t.valor),
      categoria: t.categoria,
      descricao: t.descricao,
      dataGasto: t.dataGasto.toISOString(),
      nota: t.nota,
      criadoEm: t.criadoEm.toISOString(),
      atualizadoEm: t.atualizadoEm.toISOString(),
    }));
    
    res.json({
      mes,
      ano,
      transacoes: transacoesFormatadas,
      total: transacoesFormatadas.length,
    });
  } catch (error) {
    console.error('[WEB SERVER] Erro ao buscar transações:', error);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
});

/**
 * GET /api/stats
 * Retorna estatísticas agregadas do usuário
 * Query params: mes (opcional), ano (opcional)
 */
app.get('/api/stats', autenticarToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const mes = req.query.mes ? parseInt(req.query.mes as string) : new Date().getMonth() + 1;
    const ano = req.query.ano ? parseInt(req.query.ano as string) : new Date().getFullYear();
    
    console.log(`[WEB SERVER] Gerando estatísticas para usuário ${userId} - mês ${mes}/${ano}`);
    
    const relatorio = await gerarRelatorioMensal(userId, mes, ano);
    
    console.log(`[WEB SERVER] Relatório gerado: ${relatorio.quantidadeTransacoes} transações`);
    
    res.json({
      mes,
      ano,
      totalGanhos: relatorio.totalGanhos,
      totalGastos: relatorio.totalGastos,
      saldoLiquido: relatorio.saldoLiquido,
      quantidadeTransacoes: relatorio.quantidadeTransacoes,
      quantidadeGanhos: relatorio.quantidadeGanhos,
      quantidadeGastos: relatorio.quantidadeGastos,
      resumoPorCategoria: relatorio.resumoPorCategoria.map((r) => ({
        categoria: r.categoria,
        total: r.total,
        quantidade: r.quantidade,
      })),
    });
  } catch (error) {
    console.error('[WEB SERVER] Erro ao gerar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao gerar estatísticas' });
  }
});

/**
 * GET /api/transactions/all
 * Retorna todas as transações do usuário (para gráfico de evolução temporal)
 */
app.get('/api/transactions/all', autenticarToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    console.log(`[WEB SERVER] Buscando todas as transações para usuário ${userId}`);
    
    const { prisma } = await import('../database/client');
    const transacoes = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { dataGasto: 'asc' },
    });
    
    console.log(`[WEB SERVER] ${transacoes.length} transações totais encontradas`);
    
    const transacoesFormatadas = transacoes.map((t: Transaction) => ({
      id: t.id,
      valor: Number(t.valor),
      categoria: t.categoria,
      descricao: t.descricao,
      dataGasto: t.dataGasto.toISOString(),
      nota: t.nota,
    }));
    
    res.json({
      transacoes: transacoesFormatadas,
      total: transacoesFormatadas.length,
    });
  } catch (error) {
    console.error('[WEB SERVER] Erro ao buscar todas as transações:', error);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
});

/**
 * Health check
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * PUT /api/transactions/:id
 * Atualiza uma transação existente
 */
app.put('/api/transactions/:id', autenticarToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const transacaoId = req.params.id;
    const { valor, categoria, descricao, dataGasto, nota } = req.body;
    
    console.log(`[WEB SERVER] Atualizando transação ${transacaoId} para usuário ${userId}`);
    
    // Validações básicas
    if (!transacaoId) {
      return res.status(400).json({ error: 'ID da transação não fornecido' });
    }
    
    // Prepara dados para atualização
    const dadosAtualizacao: any = {};
    if (valor !== undefined) dadosAtualizacao.valor = Number(valor);
    if (categoria) dadosAtualizacao.categoria = categoria;
    if (descricao) dadosAtualizacao.descricao = descricao;
    if (dataGasto) dadosAtualizacao.dataGasto = new Date(dataGasto);
    if (nota !== undefined) dadosAtualizacao.nota = nota;
    
    const sucesso = await atualizarTransacao(transacaoId, userId, dadosAtualizacao);
    
    if (!sucesso) {
      return res.status(404).json({ error: 'Transação não encontrada ou não pertence ao usuário' });
    }
    
    console.log(`[WEB SERVER] Transação ${transacaoId} atualizada com sucesso`);
    res.json({ success: true, message: 'Transação atualizada com sucesso' });
  } catch (error) {
    console.error('[WEB SERVER] Erro ao atualizar transação:', error);
    res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
});

/**
 * GET /api/recurring
 * Retorna gastos fixos (recorrentes) do usuário autenticado
 */
app.get('/api/recurring', autenticarToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    console.log(`[WEB SERVER] Buscando gastos fixos para usuário ${userId}`);
    
    const gastosFixos = await listarGastosFixos(userId);
    
    console.log(`[WEB SERVER] ${gastosFixos.length} gastos fixos encontrados`);
    
    // Formata gastos fixos para resposta
    const gastosFormatados = gastosFixos.map((g) => ({
      id: g.id,
      valor: Number(g.valor),
      categoria: g.categoria,
      descricao: g.descricao,
      diaDoMes: g.diaDoMes,
      nota: g.nota,
      ativo: g.ativo,
      criadoEm: g.criadoEm.toISOString(),
    }));
    
    res.json({
      gastosFixos: gastosFormatados,
      total: gastosFormatados.length,
    });
  } catch (error) {
    console.error('[WEB SERVER] Erro ao buscar gastos fixos:', error);
    res.status(500).json({ error: 'Erro ao buscar gastos fixos' });
  }
});

/**
 * DELETE /api/transactions/:id
 * Deleta uma transação existente
 */
app.delete('/api/transactions/:id', autenticarToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const transacaoId = req.params.id;
    
    console.log(`[WEB SERVER] Deletando transação ${transacaoId} para usuário ${userId}`);
    
    if (!transacaoId) {
      return res.status(400).json({ error: 'ID da transação não fornecido' });
    }
    
    const sucesso = await deletarTransacao(transacaoId, userId);
    
    if (!sucesso) {
      return res.status(404).json({ error: 'Transação não encontrada ou não pertence ao usuário' });
    }
    
    console.log(`[WEB SERVER] Transação ${transacaoId} deletada com sucesso`);
    res.json({ success: true, message: 'Transação deletada com sucesso' });
  } catch (error) {
    console.error('[WEB SERVER] Erro ao deletar transação:', error);
    res.status(500).json({ error: 'Erro ao deletar transação' });
  }
});

/**
 * Inicia o servidor web
 */
export function iniciarServidorWeb() {
  console.log(`[WEB SERVER] Iniciando servidor web na porta ${env.webPort}...`);
  
  app.listen(env.webPort, () => {
    console.log(`[WEB SERVER] ✅ Servidor web rodando em ${env.webBaseUrl}`);
    
    // Limpa tokens expirados ao iniciar e depois a cada 24 horas
    limparTokensExpirados();
    setInterval(() => {
      limparTokensExpirados();
    }, 24 * 60 * 60 * 1000); // 24 horas
  });
}
