# LazzyFinance Bot

Bot Telegram + Dashboard Web para gerenciamento financeiro pessoal com categorização automática via IA (Google Gemini 2.5 Flash).

## Funcionalidades

- Registro de gastos e ganhos via texto livre no Telegram (ex: "50 reais no mercado")
- Categorização automática com Google Gemini 2.5 Flash
- Gastos fixos recorrentes com scheduler diário e confirmação via bot
- Relatórios mensais com agrupamento por categoria e saldo líquido
- Exportação para Excel (.xlsx) com formatação e resumo
- Dashboard web (React) com gráficos, tabelas e edição de transações
- Sistema multi-usuário com isolamento completo de dados
- Planos FREE e PRO com integração Stripe

## Tecnologias

### Backend
- **TypeScript** + **Node.js**
- **Telegraf** - Framework para bot Telegram
- **Prisma** - ORM para PostgreSQL
- **Express** - API REST para o dashboard
- **Google Gemini 2.5 Flash** - IA para categorização
- **Supabase** - Banco de dados PostgreSQL hospedado
- **Stripe** - Pagamentos e planos premium
- **ExcelJS** - Geração de planilhas

### Frontend (Dashboard)
- **React** + **Vite**
- **Tailwind CSS**
- Gráficos (pizza e linhas), tabela de transações, filtro por mês
- Autenticação via token gerado pelo bot

## Pre-requisitos

1. **Node.js** 18+
2. Conta no **Supabase** (ou PostgreSQL local)
3. **API Key** do Google Gemini
4. **Token** do Telegram BotFather

## Instalacao

### 1. Instale as dependencias

```bash
npm install
cd web && npm install
```

### 2. Configure as variaveis de ambiente

Copie o arquivo de exemplo e preencha:

```bash
cp env.local.example .env.local
```

```env
TELEGRAM_BOT_TOKEN=seu_token_do_botfather
DATABASE_URL=postgresql://usuario:senha@host:6543/postgres?pgbouncer=true
GEMINI_API_KEY=sua_chave_gemini_aqui
WEB_PORT=3001
WEB_BASE_URL=http://localhost:5173
STRIPE_PROVIDER_TOKEN=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

### 3. Configure o banco de dados

```bash
npm run db:generate
npm run db:migrate
```

## Executando

### Backend (bot + API):

```bash
# Desenvolvimento (hot-reload)
npm run dev

# Producao
npm run build && npm start
```

### Frontend (dashboard):

```bash
npm run dev:web
```

O dashboard roda em `http://localhost:5173` e a API em `http://localhost:3001`.

## Comandos do Bot

| Comando | Descricao |
|---------|-----------|
| `/start` | Registra o usuario e mostra instrucoes |
| `/relatorio <mes> [ano]` | Relatorio mensal por categoria |
| `/exportar` | Exporta transacoes do mes em .xlsx |
| `/site` | Gera link de acesso ao dashboard web |
| `/fixo` | Cria um gasto fixo recorrente |
| `/meu_fixos` | Lista seus gastos fixos ativos |
| `/editar` | Edita transacoes recentes |
| `/premium` | Informacoes sobre o plano PRO |

Mensagens em texto livre sao interpretadas como transacoes:
- `gastei 50 reais no mercado`
- `ganhei 1500 de salario`
- `100 reais de uber hoje`
- `200 reais de aluguel em 01/01/2025`

## Categorias

| Categoria | Exemplos |
|-----------|----------|
| ALIMENTACAO | Mercado, restaurante, delivery, lanche |
| TRANSPORTE | Uber, gasolina, onibus, estacionamento |
| LAZER | Cinema, festas, entretenimento |
| SAUDE | Farmacia, medicos, medicamentos |
| MORADIA | Aluguel, luz, agua, internet, condominio |
| ESTUDOS | Cursos, livros, materiais |
| TRABALHO | Despesas profissionais, equipamentos |
| LUCROS | Salario, freelance, vendas, receitas |

## Planos

| | FREE | PRO |
|---|------|-----|
| Transacoes/mes | 50 | Ilimitado |
| Gastos fixos | 3 | Ilimitado |
| Dashboard web | Sim | Sim |
| Exportacao Excel | Sim | Sim |

## Estrutura do Projeto

```
src/
  bot/
    bot.ts                # Configuracao e rotas do bot
    handlers.ts           # Handlers de comandos e mensagens
  config/
    env.ts                # Validacao de variaveis de ambiente
  database/
    client.ts             # Cliente Prisma (singleton)
  scheduler/
    recurringScheduler.ts # Scheduler diario de gastos fixos
  server/
    web.server.ts         # API REST Express
  services/
    gemini.service.ts     # Integracao com Google Gemini
    transaction.service.ts # CRUD de transacoes
    recurring.service.ts  # CRUD de gastos fixos
    user.service.ts       # Gerenciamento de usuarios
    token.service.ts      # Tokens de acesso ao dashboard
    export.service.ts     # Geracao de Excel
  utils/
    dateParser.ts         # Parser de datas e formatacao
    fileCleanup.ts        # Limpeza de arquivos temporarios
web/
  src/
    components/
      Dashboard.tsx       # Pagina principal
      PieChart.tsx        # Grafico de pizza por categoria
      LineChart.tsx        # Grafico de evolucao temporal
      TransactionTable.tsx # Tabela de transacoes
      MonthFilter.tsx     # Filtro por mes/ano
      EditTransactionModal.tsx # Modal de edicao
      RecurringTransactions.tsx # Lista de gastos fixos
    services/
      api.ts              # Cliente HTTP para a API
prisma/
  schema.prisma           # Schema do banco de dados
```

## API REST

Todas as rotas (exceto health) requerem autenticacao via `Authorization: Bearer <token>`.

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/health` | Health check |
| GET | `/api/auth/validate` | Valida token |
| GET | `/api/transactions` | Transacoes do mes (query: mes, ano) |
| GET | `/api/transactions/all` | Todas as transacoes |
| PUT | `/api/transactions/:id` | Atualiza transacao |
| DELETE | `/api/transactions/:id` | Deleta transacao |
| GET | `/api/stats` | Estatisticas do mes |
| GET | `/api/recurring` | Gastos fixos |
| POST | `/api/webhooks/stripe` | Webhook do Stripe |

## Scripts

```bash
npm run dev          # Backend com hot-reload
npm run dev:web      # Frontend com Vite
npm run build        # Compila TypeScript (backend)
npm run build:web    # Build do frontend
npm start            # Executa backend compilado
npm run db:generate  # Gera Prisma Client
npm run db:migrate   # Executa migrations
npm run db:studio    # Abre Prisma Studio
npm run db:push      # Sincroniza schema sem migration
```