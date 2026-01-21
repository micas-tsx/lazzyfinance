import * as fs from 'fs';
import * as path from 'path';
import { getExportsDir } from '../services/export.service';

const HORAS_LIMITE = 12;
const MILISSEGUNDOS_POR_HORA = 60 * 60 * 1000;

/**
 * Remove arquivos da pasta exports que são mais antigos que 12 horas
 */
export function limparArquivosAntigos(): void {
  const exportsDir = getExportsDir();

  if (!fs.existsSync(exportsDir)) {
    return;
  }

  const agora = Date.now();
  const limiteTempo = agora - (HORAS_LIMITE * MILISSEGUNDOS_POR_HORA);

  try {
    const arquivos = fs.readdirSync(exportsDir);

    arquivos.forEach((arquivo) => {
      const caminhoCompleto = path.join(exportsDir, arquivo);
      
      try {
        const stats = fs.statSync(caminhoCompleto);
        
        // Verifica se é arquivo e se é mais antigo que o limite
        if (stats.isFile() && stats.mtimeMs < limiteTempo) {
          fs.unlinkSync(caminhoCompleto);
          console.log(`🗑️ Arquivo antigo removido: ${arquivo}`);
        }
      } catch (error) {
        console.error(`Erro ao processar arquivo ${arquivo}:`, error);
      }
    });
  } catch (error) {
    console.error('Erro ao limpar arquivos antigos:', error);
  }
}

/**
 * Inicia limpeza automática periódica (a cada hora)
 */
export function iniciarLimpezaAutomatica(): NodeJS.Timeout {
  // Limpa imediatamente
  limparArquivosAntigos();

  // Agenda limpeza a cada hora
  return setInterval(() => {
    limparArquivosAntigos();
  }, MILISSEGUNDOS_POR_HORA);
}
