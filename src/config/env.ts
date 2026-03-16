import dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config(); // Carrega .env por padrão
dotenv.config({ path: '.env.local', override: true }); // Sobrescreve com .env.local se existir

console.log('[ENV] WEB_PORT do process.env:', process.env.WEB_PORT);

interface EnvConfig {
  telegramBotToken: string;
  databaseUrl: string;
  geminiApiKey: string;
  webPort: number;
  webBaseUrl: string;
}

function validateEnv(): EnvConfig {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const databaseUrl = process.env.DATABASE_URL;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const webPort = parseInt(process.env.WEB_PORT || '5173', 10);
  const webBaseUrl = process.env.WEB_BASE_URL || `http://localhost:${webPort}`;

  if (!telegramBotToken) {
    throw new Error('TELEGRAM_BOT_TOKEN não encontrado no .env.local');
  }

  if (!databaseUrl) {
    throw new Error('DATABASE_URL não encontrado no .env.local');
  }

  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY não encontrado no .env.local');
  }

  return {
    telegramBotToken,
    databaseUrl,
    geminiApiKey,
    webPort,
    webBaseUrl,
  };
}

export const env = validateEnv();
