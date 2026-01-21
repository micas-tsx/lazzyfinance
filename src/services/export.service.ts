import ExcelJS from 'exceljs';
import { Transaction } from '@prisma/client';
import { buscarTransacoesPorMes, gerarRelatorioMensal } from './transaction.service';
import { formatarData, formatarMoeda } from '../utils/dateParser';
import * as fs from 'fs';
import * as path from 'path';

const EXPORTS_DIR = path.join(process.cwd(), 'exports');
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Garante que a pasta exports existe
 */
function garantirPastaExports(): void {
  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  }
}

/**
 * Gera nome do arquivo baseado no mês e ano
 */
function gerarNomeArquivo(mes: number, ano: number): string {
  const meses = [
    'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const mesNome = meses[mes - 1];
  return `LazzyFinance_${mesNome}_${ano}.xlsx`;
}

/**
 * Formata uma transação para linha do Excel
 */
function formatarTransacaoParaLinha(transacao: Transaction, index: number): any[] {
  const ehGanho = transacao.categoria === 'LUCROS';
  const tipo = ehGanho ? 'Ganho' : 'Gasto';
  
  return [
    index + 1, // Número sequencial
    formatarData(transacao.dataGasto), // Data
    formatarMoeda(Number(transacao.valor)), // Valor
    transacao.categoria, // Categoria
    tipo, // Tipo (Ganho/Gasto)
    transacao.descricao, // Descrição
    transacao.nota || '', // Nota
    formatarData(transacao.criadoEm), // Criado em
    formatarData(transacao.atualizadoEm), // Atualizado em
  ];
}

/**
 * Gera arquivo Excel com transações do mês
 */
export async function gerarExcelTransacoes(
  userId: string,
  mes: number,
  ano: number
): Promise<{ caminhoArquivo: string; nomeArquivo: string } | null> {
  // Busca transações
  const transacoes = await buscarTransacoesPorMes(userId, mes, ano);

  // Se não houver transações, retorna null
  if (transacoes.length === 0) {
    return null;
  }

  // Gera relatório para resumo
  const relatorio = await gerarRelatorioMensal(userId, mes, ano);

  // Garante que a pasta existe
  garantirPastaExports();

  // Cria workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Transações');

  // Define colunas
  worksheet.columns = [
    { header: 'Nº', key: 'numero', width: 8 },
    { header: 'Data', key: 'data', width: 15 },
    { header: 'Valor', key: 'valor', width: 15 },
    { header: 'Categoria', key: 'categoria', width: 15 },
    { header: 'Tipo', key: 'tipo', width: 12 },
    { header: 'Descrição', key: 'descricao', width: 30 },
    { header: 'Nota', key: 'nota', width: 30 },
    { header: 'Criado em', key: 'criadoEm', width: 18 },
    { header: 'Atualizado em', key: 'atualizadoEm', width: 18 },
  ];

  // Estiliza cabeçalho
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }, // Azul
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 20;

  // Adiciona transações
  transacoes.forEach((transacao, index) => {
    const row = worksheet.addRow(formatarTransacaoParaLinha(transacao, index));
    
    // Alterna cores das linhas para melhor leitura
    if (index % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }, // Cinza claro
      };
    }

    // Cor diferente para ganhos
    if (transacao.categoria === 'LUCROS') {
      row.getCell('valor').font = { color: { argb: 'FF00AA00' }, bold: true }; // Verde
    } else {
      row.getCell('valor').font = { color: { argb: 'FFAA0000' } }; // Vermelho
    }

    // Alinhamento
    row.getCell('numero').alignment = { horizontal: 'center' };
    row.getCell('valor').alignment = { horizontal: 'right' };
    row.getCell('categoria').alignment = { horizontal: 'center' };
    row.getCell('tipo').alignment = { horizontal: 'center' };
  });

  // Adiciona bordas em todas as células com dados
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // Adiciona linha em branco antes do resumo
  worksheet.addRow([]);

  // Adiciona resumo
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mesNome = meses[mes - 1];

  // Título do resumo
  const tituloResumo = worksheet.addRow(['RESUMO DO MÊS']);
  tituloResumo.font = { bold: true, size: 14, color: { argb: 'FF4472C4' } };
  tituloResumo.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE7E6E6' },
  };
  worksheet.mergeCells(`A${tituloResumo.number}:I${tituloResumo.number}`);
  tituloResumo.getCell(1).alignment = { horizontal: 'center' };
  worksheet.addRow([]);

  // Período
  const periodoRow = worksheet.addRow(['Período:', `${mesNome} de ${ano}`]);
  periodoRow.font = { bold: true };
  worksheet.mergeCells(`B${periodoRow.number}:I${periodoRow.number}`);
  worksheet.addRow([]);

  // Totais gerais
  worksheet.addRow(['Total de Ganhos:', formatarMoeda(relatorio.totalGanhos)]);
  worksheet.addRow(['Total de Gastos:', formatarMoeda(relatorio.totalGastos)]);
  worksheet.addRow(['Saldo Líquido:', formatarMoeda(relatorio.saldoLiquido)]);
  worksheet.addRow([]);

  // Resumo por categoria
  worksheet.addRow(['RESUMO POR CATEGORIA']);
  const tituloCategoria = worksheet.getRow(worksheet.rowCount);
  tituloCategoria.font = { bold: true, color: { argb: 'FF4472C4' } };
  tituloCategoria.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE7E6E6' },
  };
  worksheet.mergeCells(`A${tituloCategoria.number}:I${tituloCategoria.number}`);
  tituloCategoria.getCell(1).alignment = { horizontal: 'center' };
  worksheet.addRow([]);

  // Cabeçalho do resumo por categoria
  const headerCategoria = worksheet.addRow(['Categoria', 'Tipo', 'Total', 'Quantidade']);
  headerCategoria.font = { bold: true };
  headerCategoria.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' },
  };
  headerCategoria.getCell(1).alignment = { horizontal: 'center' };
  headerCategoria.getCell(2).alignment = { horizontal: 'center' };
  headerCategoria.getCell(3).alignment = { horizontal: 'right' };
  headerCategoria.getCell(4).alignment = { horizontal: 'center' };

  // Adiciona categorias ordenadas (LUCROS primeiro)
  const categoriasOrdenadas = [...relatorio.resumoPorCategoria].sort((a, b) => {
    if (a.categoria === 'LUCROS') return -1;
    if (b.categoria === 'LUCROS') return 1;
    return b.total - a.total;
  });

  categoriasOrdenadas.forEach((resumo) => {
    const tipo = resumo.categoria === 'LUCROS' ? 'Ganho' : 'Gasto';
    const row = worksheet.addRow([
      resumo.categoria,
      tipo,
      formatarMoeda(resumo.total),
      resumo.quantidade,
    ]);

    if (resumo.categoria === 'LUCROS') {
      row.getCell(3).font = { color: { argb: 'FF00AA00' }, bold: true }; // Verde
    } else {
      row.getCell(3).font = { color: { argb: 'FFAA0000' } }; // Vermelho
    }

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'right' };
    row.getCell(4).alignment = { horizontal: 'center' };
  });

  // Aplica bordas no resumo também
  const inicioResumo = transacoes.length + 3; // +3 para cabeçalho e linha em branco
  for (let i = inicioResumo; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    if (row.hasValues) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    }
  }

  // Gera nome do arquivo
  const nomeArquivo = gerarNomeArquivo(mes, ano);
  const caminhoArquivo = path.join(EXPORTS_DIR, nomeArquivo);

  // Salva arquivo
  await workbook.xlsx.writeFile(caminhoArquivo);

  // Verifica tamanho do arquivo
  const stats = fs.statSync(caminhoArquivo);
  if (stats.size > MAX_FILE_SIZE_BYTES) {
    // Deleta arquivo se for muito grande
    fs.unlinkSync(caminhoArquivo);
    throw new Error('ARQUIVO_MUITO_GRANDE');
  }

  return {
    caminhoArquivo,
    nomeArquivo,
  };
}

/**
 * Obtém caminho completo da pasta exports
 */
export function getExportsDir(): string {
  return EXPORTS_DIR;
}
