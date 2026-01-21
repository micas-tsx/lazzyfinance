/**
 * Parse de meses em português para número
 */
export function parseMes(mesNome: string): number | null {
  const meses: Record<string, number> = {
    janeiro: 1,
    fevereiro: 2,
    marco: 3,
    março: 3,
    abril: 4,
    maio: 5,
    junho: 6,
    julho: 7,
    agosto: 8,
    setembro: 9,
    outubro: 10,
    novembro: 11,
    dezembro: 12,
  };

  const mesLower = mesNome.toLowerCase().trim();
  return meses[mesLower] || null;
}

/**
 * Parse de data a partir de texto em português
 * Retorna a data atual se não conseguir parsear
 */
export function parseData(texto: string): Date {
  const hoje = new Date();
  
  // Padrões comuns
  const hojeRegex = /hoje/i;
  const ontemRegex = /ontem/i;
  
  if (hojeRegex.test(texto)) {
    return hoje;
  }
  
  if (ontemRegex.test(texto)) {
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    return ontem;
  }
  
  // Tenta parsear formato dd/mm/yyyy ou dd-mm-yyyy
  const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
  const match = texto.match(dateRegex);
  
  if (match) {
    const [, dia, mes, ano] = match;
    const anoCompleto = ano.length === 2 ? `20${ano}` : ano;
    return new Date(parseInt(anoCompleto), parseInt(mes) - 1, parseInt(dia));
  }
  
  // Se não conseguir parsear, retorna hoje
  return hoje;
}

/**
 * Formata data para exibição
 */
export function formatarData(data: Date): string {
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formata valor monetário
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}
