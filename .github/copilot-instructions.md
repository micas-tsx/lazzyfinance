# LazzyFinance - Instruções para Agentes de IA

## 🎯 Visão Geral da Arquitetura

**LazzyFinance** é um bot Telegram + dashboard web para gerenciamento financeiro pessoal. A arquitetura segue separação de responsabilidades com três camadas principais:

1. **Bot Telegram** (`src/bot/`) - Interface principal para registro de transações
2. **API Web** (`src/server/web.server.ts`) - Servidor Express que serve o dashboard web
3. **Dashboard Web** (`web/src/`) - Frontend React com Vite para visualização de dados

**Fluxo de dados**: Usuário (Telegram) → Bot registra → Banco PostgreSQL ← API Web ← Dashboard (React)

---

## 📦 Estrutura de Código e Responsabilidades

### Backend (src/)

- **`bot/`** - Lógica do Telegram Bot (Telegraf)
  - `bot.ts` - Configuração de comandos e handlers de mensagens
  - `handlers.ts` - Implementação dos comandos (`/start`, `/relatorio`, etc.)
  
- **`services/`** - Lógica de negócios isolada
  - `ollama.service.ts` - Integração com IA local (categorização automática)
  - `transaction.service.ts` - CRUD e relatórios de transações
  - `user.service.ts` - Gerenciamento de usuários Telegram
  - `token.service.ts` - Geração/validação de tokens para autenticação web
  - `export.service.ts` - Exportação de dados em Excel

- **`database/`** - Camada de dados
  - `client.ts` - Singleton do Prisma Client

- **`config/env.ts`** - Validação e carregamento de variáveis de ambiente

### Frontend (web/src/)

- **`components/`** - Componentes React
  - `Dashboard.tsx` - Página principal com gráficos e tabela
  - `LineChart.tsx`, `PieChart.tsx` - Visualizações Chart.js
  - `TransactionTable.tsx`, `MonthFilter.tsx` - Componentes auxiliares

- **`services/api.ts`** - Cliente HTTP para comunicação com backend

---

## 🗄️ Banco de Dados (Prisma)

### Tabelas-chave

**users** - Armazena dados do Telegram
- `telegramId` (unique) - ID do Telegram
- `id`, `firstName`, `lastName`, `username`, `languageCode`

**transactions** - Registra gastos/ganhos
- `userId` (FK) - Referência ao usuário (CASCADE delete)
- `valor` (Decimal), `categoria` (Enum), `descricao`, `dataGasto`
- Índices: `(userId)` e `(userId, dataGasto)` para relatórios rápidos

**access_tokens** - Tokens JWT para acesso web
- `token` (unique), `userId` (FK), `expiraEm`, `usadoEm`

**Categorias suportadas**: TRANSPORTE, LAZER, SAUDE, MORADIA, ESTUDOS, LUCROS

---

## 🤖 Padrões e Convenções

### Conversão de Valores Monetários
- Sempre use `Decimal` (Prisma) para valores monetários - preserve `Decimal` ao serializar JSON
- Não converta para float durante cálculos financeiros

### Autenticação
- Bot: Via `telegramId` (automática do contexto Telegram)
- Web: Via token JWT (gerado no handler `/site` do bot, armazenado em `access_tokens`)
- Middleware web valida token antes de cada requisição

### Isolamento de Dados por Usuário
- **OBRIGATÓRIO**: Toda query de transações deve filtrar por `userId`
- Exemplo: `prisma.transaction.findMany({ where: { userId } })`
- Nunca exponha dados de outros usuários nas APIs

### Categorização com Ollama
- Em caso de falha (timeout/conexão), `inferirCategoria()` usa palavras-chave como fallback
- Categoria padrão é "LAZER" quando nenhuma palavra-chave coincide

---

## 🔄 Workflows Comuns

### Registrar Transação (Telegram)
1. User envia mensagem de texto (ex: "50 reais no mercado")
2. `handleGasto()` → `categorizarGasto()` (Ollama)
3. Bot mostra preview com categoria proposta
4. User confirma (sim/não/[1-6] para escolher categoria)
5. `handleConfirmacao()` → `salvarTransacao()`

### Gerar Relatório
- `/relatorio <mês> [ano]` → `handleRelatorio()` → `gerarRelatorioMensal()`
- Retorna: total de ganhos, total de gastos, saldo, breakdown por categoria

### Acessar Dashboard Web
1. User digitará `/site` no Telegram
2. Bot gera token com `gerarAccessToken()`
3. Retorna URL com token na query: `http://localhost:5173?token=...`
4. Frontend armazena em `localStorage`, API valida em cada requisição

---

## 🚀 Scripts de Desenvolvimento

```bash
# Root (backend)
npm run dev          # Inicia bot + servidor web com hot-reload
npm run build        # Compila TypeScript
npm start            # Produção (versão compilada)

# Banco de dados
npm run db:migrate   # Cria migrations (com confirmação interativa)
npm run db:generate  # Regenera Prisma Client (rode após mudanças em schema)
npm run db:studio    # Abre UI Prisma Studio para inspecionar dados

# Frontend
cd web && npm run dev    # Dev server Vite (porta 5173)
cd web && npm run build  # Build otimizado
```

---

## 🔗 Integração entre Componentes

### Bot → API Web
- Endpoints autenticados: `GET /api/auth/validate`, `GET /api/transactions/:month/:year`
- Token passado no header: `Authorization: Bearer <token>`

### Frontend → API Web
- ApiService (`web/src/services/api.ts`) centraliza requisições HTTP
- Valida token automaticamente; se expirado, redireciona para login

### Ollama → Categorização
- Comunicação HTTP com modelo local (padrão: `http://localhost:11434`)
- Modelo padrão: `llama2` (configurável via `OLLAMA_MODEL`)
- Prompt solicita JSON estruturado; resposta parseada em `GastoCategorizado`

---

## ⚠️ Restrições e Considerações Técnicas

- **Multi-usuário obrigatório**: Não há mais transações "globais" - sempre filtrar por `userId`
- **PostgreSQL requerido**: Não há fallback para SQLite
- **Ollama local**: Não há fallback para API remota (privacidade)
- **Tokens com expiração**: `AccessToken.expiraEm` define validade (cleanup automático)
- **Sem edição/exclusão**: Transações não podem ser editadas/deletadas pela UI (apenas adicionadas)
- **Relatórios somente-leitura**: Dados são apenas consultados, não modificados pelo dashboard

---

## 🔍 Debugging Rápido

- Logs: `console.log()` com prefixo `[BOT]`, `[WEB SERVER]`, etc.
- Banco: Use `npm run db:studio` para inspecionar dados em tempo real
- API: Testar com `curl` ou Postman (não esquecer token no header)
- Ollama: Verificar se rodando com `curl http://localhost:11434/api/generate`
- Variáveis: `.env.local` (não versionado; copie de `env.local.example`)

---

## 📄 Documentação de Referência

- **README.md** - Setup inicial e pré-requisitos
- **RESUMO_PROJETO.md** - Detalhes completos de funcionalidades e troubleshooting
- **prisma/schema.prisma** - Schema do banco (fonte verdade para estrutura)
- **OLLAMA_SETUP.md**, **POSTGRESQL_SETUP.md** - Guias de instalação de dependências externas
