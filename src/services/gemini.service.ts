import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { env } from '../config/env';

export interface GastoCategorizado {
  valor: number;
  categoria: string;
  descricao: string;
  nota?: string;
}

const genAI = new GoogleGenerativeAI(env.geminiApiKey);

// Schema para resposta estruturada
const schema: any = {
  description: "Transação financeira categorizada",
  type: SchemaType.OBJECT,
  properties: {
    valor: {
      type: SchemaType.NUMBER,
      description: "O valor numérico do gasto ou ganho. Se não identificado, use 0.",
      nullable: false,
    },
    categoria: {
      type: SchemaType.STRING,
      description: "Uma das categorias: ALIMENTACAO, TRANSPORTE, LAZER, SAUDE, MORADIA, ESTUDOS, TRABALHO, LUCROS",
      nullable: false,
    },
    descricao: {
      type: SchemaType.STRING,
      description: "Descrição curta e clara da transação",
      nullable: false,
    },
    nota: {
      type: SchemaType.STRING,
      description: "Nota adicional ou detalhe extra se houver",
      nullable: true,
    },
  },
  required: ["valor", "categoria", "descricao"],
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: schema,
  },
});

/**
 * Categoriza uma transação (gasto ou ganho) usando Google Gemini
 * Retorna a categoria sugerida e extrai informações da descrição
 */
export async function categorizarGasto(descricao: string): Promise<GastoCategorizado | null> {
  const prompt = `Você é um assistente financeiro. Analise a seguinte descrição de transação financeira e categorize-a.

Descrição: "${descricao}"

Categorias disponíveis e regras:
- ALIMENTACAO: comida, restaurante, mercado, delivery, lanche
- TRANSPORTE: uber, gasolina, estacionamento, ônibus, metrô
- LAZER: cinema, restaurantes, festas, etc.
- SAUDE: médicos, farmácia, medicamentos, etc.
- MORADIA: aluguel, condomínio, luz, água, gás, IPTU, internet residencial
- ESTUDOS: cursos, livros, materiais, etc.
- TRABALHO: despesas de trabalho, materiais, equipamentos profissionais
- LUCROS: APENAS se houver palavras de ganho: "recebi", "ganhei", "lucrei", "salário", "pagamento recebido", "venda de", "renda"

Por PADRÃO, assuma que é um GASTO (ALIMENTACAO, TRANSPORTE, etc).`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    const resultado: GastoCategorizado = JSON.parse(text);

    // Normaliza a categoria para uppercase
    resultado.categoria = resultado.categoria.toUpperCase();

    // Validação básica de categoria
    const categoriasValidas = ['ALIMENTACAO', 'TRANSPORTE', 'LAZER', 'SAUDE', 'MORADIA', 'ESTUDOS', 'TRABALHO', 'LUCROS'];
    if (!categoriasValidas.includes(resultado.categoria)) {
      resultado.categoria = 'LAZER'; // Fallback
    }

    return resultado;
  } catch (error) {
    console.error('Erro ao categorizar gasto com Gemini:', error);
    return null;
  }
}
