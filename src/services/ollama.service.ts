import { env } from '../config/env';

export interface GastoCategorizado {
  valor: number;
  categoria: string;
  descricao: string;
  nota?: string;
}

interface OllamaResponse {
  response: string;
}

/**
 * Categoriza uma transação (gasto ou ganho) usando Ollama local
 * Retorna a categoria sugerida e extrai informações da descrição
 */
export async function categorizarGasto(descricao: string): Promise<GastoCategorizado | null> {
  const prompt = `Você é um assistente financeiro. Analise a seguinte descrição de transação financeira (pode ser um gasto ou um ganho) e categorize-a.

Descrição: "${descricao}"

Categorias disponíveis: ALIMENTACAO, TRANSPORTE, LAZER, SAUDE, MORADIA, ESTUDOS, TRABALHO, LUCROS

IMPORTANTE: 
- Se a descrição indicar que é um GANHO/RECEITA (ex: "recebi", "ganhei", "salário", "venda", "pagamento recebido"), use a categoria LUCROS
- Se for um GASTO/DESPESA, use uma das outras categorias conforme o contexto
- ALIMENTACAO: comida, restaurante, mercado, compras de alimentos
- TRABALHO: despesas de trabalho, materiais, equipamentos
- Use LUCROS apenas para receitas/ganhos

Extraia da descrição:
1. O valor numérico (se houver)
2. A categoria mais apropriada (use EXATAMENTE uma das categorias acima)
3. Uma descrição curta da transação

Responda APENAS em formato JSON válido, sem markdown ou formatação adicional:
{
  "valor": número,
  "categoria": "CATEGORIA_ESCOLHIDA",
  "descricao": "descrição curta",
  "nota": "opcional - nota adicional se houver"
}

Se não conseguir extrair o valor, use 0. Se não tiver certeza da categoria, use a que melhor se encaixa.`;

  try {
    const response = await fetch(`${env.ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.ollamaModel,
        prompt: prompt,
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json() as OllamaResponse;
    
    // Ollama pode retornar JSON dentro da resposta
    let jsonStr = data.response.trim();
    
    // Remove markdown code blocks se houver
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Tenta extrair JSON da resposta
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const resultado: GastoCategorizado = JSON.parse(jsonStr);

    // Validação básica
    if (!resultado.categoria || !resultado.descricao) {
      throw new Error('Resposta do Ollama está incompleta');
    }

    // Normaliza a categoria para uppercase
    resultado.categoria = resultado.categoria.toUpperCase();

    // Valida se a categoria é uma das permitidas
    const categoriasValidas = ['ALIMENTACAO', 'TRANSPORTE', 'LAZER', 'SAUDE', 'MORADIA', 'ESTUDOS', 'TRABALHO', 'LUCROS'];
    if (!categoriasValidas.includes(resultado.categoria)) {
      // Se não for válida, tenta inferir
      resultado.categoria = inferirCategoria(resultado.descricao);
    }

    return resultado;
  } catch (error) {
    console.error('Erro ao categorizar gasto com Ollama:', error);
    return null;
  }
}

/**
 * Infere categoria baseado em palavras-chave se o Ollama falhar
 */
function inferirCategoria(descricao: string): string {
  const descricaoLower = descricao.toLowerCase();

  const keywords: Record<string, string> = {
    // Ganhos/Lucros (prioridade alta - verificar primeiro)
    recebi: 'LUCROS',
    recebido: 'LUCROS',
    recebimento: 'LUCROS',
    ganhei: 'LUCROS',
    ganho: 'LUCROS',
    salario: 'LUCROS',
    salário: 'LUCROS',
    venda: 'LUCROS',
    vendi: 'LUCROS',
    pagamento: 'LUCROS',
    pagou: 'LUCROS',
    lucro: 'LUCROS',
    lucros: 'LUCROS',
    receita: 'LUCROS',
    renda: 'LUCROS',
    freela: 'LUCROS',
    freelance: 'LUCROS',
    'paguei': 'TRANSPORTE', // "paguei uber" é transporte, não lucro
    // Alimentação
    alimentacao: 'ALIMENTACAO',
    comida: 'ALIMENTACAO',
    mercado: 'ALIMENTACAO',
    restaurante: 'ALIMENTACAO',
    padaria: 'ALIMENTACAO',
    supermercado: 'ALIMENTACAO',
    // Transporte
    transporte: 'TRANSPORTE',
    uber: 'TRANSPORTE',
    taxi: 'TRANSPORTE',
    gasolina: 'TRANSPORTE',
    onibus: 'TRANSPORTE',
    ônibus: 'TRANSPORTE',
    metro: 'TRANSPORTE',
    metrô: 'TRANSPORTE',
    // Lazer
    lazer: 'LAZER',
    cinema: 'LAZER',
    bar: 'LAZER',
    festa: 'LAZER',
    // Saúde
    saude: 'SAUDE',
    saúde: 'SAUDE',
    medicamento: 'SAUDE',
    medico: 'SAUDE',
    médico: 'SAUDE',
    hospital: 'SAUDE',
    farmacia: 'SAUDE',
    farmácia: 'SAUDE',
    // Moradia
    moradia: 'MORADIA',
    aluguel: 'MORADIA',
    conta: 'MORADIA',
    luz: 'MORADIA',
    agua: 'MORADIA',
    água: 'MORADIA',
    // Estudos
    estudos: 'ESTUDOS',
    curso: 'ESTUDOS',
    livro: 'ESTUDOS',
    escola: 'ESTUDOS',
    // Trabalho
    trabalho: 'TRABALHO',
    material: 'TRABALHO',
    equipamento: 'TRABALHO',
    software: 'TRABALHO',
  };

  for (const [keyword, categoria] of Object.entries(keywords)) {
    if (descricaoLower.includes(keyword)) {
      return categoria;
    }
  }

  // Padrão: LAZER se não conseguir inferir
  return 'LAZER';
}
