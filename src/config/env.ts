import dotenv from 'dotenv';

// Carrega variáveis de ambiente do arquivo .env.local
dotenv.config({ path: '.env.local' });

interface EnvConfig {
  telegramBotToken: string;
  databaseUrl: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  webPort: number;
  webBaseUrl: string;
}

function validateEnv(): EnvConfig {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const databaseUrl = process.env.DATABASE_URL;
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama2';
  const webPort = parseInt(process.env.WEB_PORT || '5173', 10);
  const webBaseUrl = process.env.WEB_BASE_URL || `http://localhost:${webPort}`;

  if (!telegramBotToken) {
    throw new Error('TELEGRAM_BOT_TOKEN não encontrado no .env.local');
  }

  if (!databaseUrl) {
    throw new Error('DATABASE_URL não encontrado no .env.local');
  }

  return {
    telegramBotToken,
    databaseUrl,
    ollamaBaseUrl,
    ollamaModel,
    webPort,
    webBaseUrl,
  };
}

export const env = validateEnv();
