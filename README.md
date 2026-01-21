# 🤖 LazzyFinance Bot

Bot Telegram em TypeScript para gerenciamento de gastos financeiros com categorização automática via IA (Ollama).

## 📋 Funcionalidades

- ✅ Recebe descrições de gastos em texto livre (ex: "50 reais no mercado")
- 🤖 Categoriza automaticamente usando Ollama (IA local e gratuita)
- 💾 Salva transações no PostgreSQL
- 📊 Gera relatórios mensais por categoria
- ✅ Sistema de confirmação antes de salvar

## 🚀 Tecnologias

- **TypeScript** - Linguagem principal
- **Telegraf** - Framework para bot Telegram
- **Prisma** - ORM para PostgreSQL
- **Ollama** - IA local para categorização
- **PostgreSQL** - Banco de dados

## 📦 Pré-requisitos

1. **Node.js** 18+ instalado
2. **PostgreSQL** instalado e rodando
3. **Ollama** instalado e rodando (veja instruções abaixo)

## 🔧 Instalação

### 1. Clone o repositório e instale dependências

```bash
npm install
```

### 2. Instale e configure o Ollama

#### Windows/Mac/Linux:

1. Baixe e instale o Ollama: https://ollama.ai/download
2. Abra o terminal e execute:

```bash
# Baixa o modelo (recomendado: llama2 ou mistral)
ollama pull llama2
# ou
ollama pull mistral
```

3. Teste se está funcionando:

```bash
ollama run llama2
```

4. Por padrão, o Ollama roda em `http://localhost:11434`

### 3. Configure o banco de dados PostgreSQL

Crie um banco de dados:

```sql
CREATE DATABASE lazzyfinance;
```

### 4. Configure as variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp env.local.example .env.local
```

Edite `.env.local` com suas configurações:

```env
TELEGRAM_BOT_TOKEN=seu_token_do_botfather
DATABASE_URL=postgresql://usuario:senha@localhost:5432/lazzyfinance
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

#### Como obter o token do Telegram:

1. Abra o Telegram e procure por `@BotFather`
2. Envie `/newbot` e siga as instruções
3. Copie o token fornecido

### 5. Execute as migrations do Prisma

```bash
# Gera o Prisma Client
npm run db:generate

# Cria as tabelas no banco
npm run db:migrate
```

## ▶️ Executando

### Modo desenvolvimento (com hot-reload):

```bash
npm run dev
```

### Modo produção:

```bash
# Compila o TypeScript
npm run build

# Inicia o bot
npm start
```

## 📱 Como usar

1. Abra o Telegram e procure pelo seu bot
2. Envie `/start` para ver as instruções
3. Para registrar um gasto ou lucro, envie uma mensagem como:
   - `gasto 50 reais no mercado`
   - `gastei 100 reais de uber hoje`
   - `gastei 200 reais de aluguel em 01/01/2025`
   - `ganhei 150 de um freela ontem`
   - `lucrei 130 fazendo um uber`
4. O bot irá categorizar e pedir confirmação
5. Use `/relatorio agosto` para ver o relatório do mês
6. Use `/exportar` para criar um arquivo .xlsx dos gastos
7. função futura: `/site` acessa as informações em um site
   

## 🏗️ Estrutura do projeto

```
src/
├── bot/
│   ├── bot.ts          # Configuração do bot
│   └── handlers.ts     # Handlers de comandos e mensagens
├── config/
│   └── env.ts          # Configuração de variáveis de ambiente
├── database/
│   └── client.ts       # Cliente Prisma
├── services/
│   ├── ollama.service.ts      # Integração com Ollama
│   └── transaction.service.ts # Lógica de transações
├── utils/
│   └── dateParser.ts   # Utilitários de data
└── index.ts            # Ponto de entrada
```

## 🔍 Scripts disponíveis

- `npm run dev` - Executa em modo desenvolvimento
- `npm run build` - Compila o TypeScript
- `npm start` - Executa em produção
- `npm run db:migrate` - Executa migrations
- `npm run db:generate` - Gera Prisma Client
- `npm run db:studio` - Abre Prisma Studio (interface gráfica do banco)

## 📝 Categorias disponíveis

- **TRANSPORTE** - Uber, táxi, gasolina, ônibus, etc.
- **LAZER** - Cinema, restaurantes, festas, etc.
- **SAUDE** - Médicos, farmácia, medicamentos, etc.
- **MORADIA** - Aluguel, contas, luz, água, etc.
- **ESTUDOS** - Cursos, livros, materiais, etc.
- **LUCROS** - Receitas, vendas, salário, etc.

## 🐛 Troubleshooting

### Ollama não está respondendo

Verifique se o Ollama está rodando:
```bash
ollama list
```

Se não estiver, inicie:
```bash
ollama serve
```

### Erro de conexão com PostgreSQL

Verifique se o PostgreSQL está rodando e se as credenciais no `.env.local` estão corretas.

### Bot não responde

1. Verifique se o token do Telegram está correto
2. Confira os logs no console
3. Verifique se o bot foi iniciado corretamente com `/start`
