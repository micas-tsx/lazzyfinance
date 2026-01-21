# 🐘 Guia de Configuração do PostgreSQL

## 📥 Instalação do PostgreSQL

### Windows

1. **Baixe o instalador:**
   - Acesse: https://www.postgresql.org/download/windows/
   - Clique em "Download the installer"
   - Baixe a versão mais recente (recomendado: PostgreSQL 15 ou 16)

2. **Execute o instalador:**
   - Clique duas vezes no arquivo baixado
   - Siga o assistente de instalação
   - **IMPORTANTE**: Anote a senha que você definir para o usuário `postgres` (usuário padrão)
   - Deixe a porta padrão: `5432`
   - Deixe o locale como está (ou escolha "Portuguese, Brazil")

3. **Verifique a instalação:**
   - Abra o **pgAdmin** (instalado junto com PostgreSQL)
   - Ou abra o **SQL Shell (psql)** pelo menu Iniciar

## 🗄️ Criar o Banco de Dados

Você tem **3 opções** para criar o banco:

### Opção 1: Usando pgAdmin (Interface Gráfica) - Mais Fácil

1. Abra o **pgAdmin** (procure no menu Iniciar)
2. Conecte ao servidor (clique no servidor "PostgreSQL" e digite a senha)
3. Clique com botão direito em **"Databases"** → **"Create"** → **"Database..."**
4. Nome do banco: `lazzyfinance`
5. Clique em **"Save"**

### Opção 2: Usando SQL Shell (psql) - Via Terminal

1. Abra o **SQL Shell (psql)** pelo menu Iniciar
2. Pressione Enter para aceitar os valores padrão até chegar na senha
3. Digite a senha do usuário `postgres` que você definiu na instalação
4. Execute o comando:

```sql
CREATE DATABASE lazzyfinance;
```

5. Para verificar se foi criado:

```sql
\l
```

6. Para sair:

```sql
\q
```

### Opção 3: Usando PowerShell/CMD

1. Abra o PowerShell ou CMD
2. Navegue até a pasta do PostgreSQL (geralmente em `C:\Program Files\PostgreSQL\16\bin`)
3. Execute:

```bash
psql -U postgres
```

4. Digite a senha quando solicitado
5. Execute:

```sql
CREATE DATABASE lazzyfinance;
```

6. Saia com `\q`

## ⚙️ Configurar a String de Conexão

Agora você precisa configurar a conexão no arquivo `.env.local`:

### Formato da String de Conexão:

```
postgresql://usuario:senha@localhost:5432/lazzyfinance
```

### Exemplo prático:

Se você:
- **Usuário**: `postgres` (padrão)
- **Senha**: `minhasenha123` (a que você definiu na instalação)
- **Porta**: `5432` (padrão)
- **Banco**: `lazzyfinance`

Sua string seria:

```
postgresql://postgres:minhasenha123@localhost:5432/lazzyfinance
```

### Configurar no projeto:

1. Crie o arquivo `.env.local` na raiz do projeto (se ainda não criou)
2. Adicione a linha:

```env
DATABASE_URL=postgresql://postgres:SUA_SENHA_AQUI@localhost:5432/lazzyfinance
```

**⚠️ IMPORTANTE**: Substitua `SUA_SENHA_AQUI` pela senha real que você definiu!

## 🚀 Criar as Tabelas (Migrations)

Depois de configurar o `.env.local`, execute os comandos:

### 1. Instalar dependências (se ainda não fez):

```bash
npm install
```

### 2. Gerar o Prisma Client:

```bash
npm run db:generate
```

### 3. Criar as tabelas no banco:

```bash
npm run db:migrate
```

Quando executar `db:migrate`, o Prisma vai:
- Criar uma pasta `prisma/migrations/`
- Criar a tabela `transactions` com todas as colunas
- Aplicar o schema no banco de dados

### 4. (Opcional) Verificar no pgAdmin:

1. Abra o pgAdmin
2. Navegue até: Servidores → PostgreSQL → Databases → lazzyfinance → Schemas → public → Tables
3. Você deve ver a tabela `transactions` criada!

## 🧪 Testar a Conexão

Para testar se está tudo funcionando, você pode executar:

```bash
npm run db:studio
```

Isso abre o **Prisma Studio**, uma interface gráfica para ver e editar dados do banco.

## ❓ Troubleshooting

### "Erro: password authentication failed"

- Verifique se a senha no `.env.local` está correta
- Tente resetar a senha do PostgreSQL (veja abaixo)

### "Erro: database does not exist"

- Certifique-se de que criou o banco `lazzyfinance`
- Verifique se o nome está correto no `.env.local`

### "Erro: connection refused"

- Verifique se o PostgreSQL está rodando:
  - Abra o **Gerenciador de Tarefas** → Procure por `postgres.exe`
  - Ou tente iniciar o serviço: Menu Iniciar → Serviços → PostgreSQL

### Resetar senha do PostgreSQL (Windows)

1. Abra o **SQL Shell (psql)**
2. Conecte como usuário `postgres`
3. Execute:

```sql
ALTER USER postgres WITH PASSWORD 'novasenha';
```

4. Atualize o `.env.local` com a nova senha

### Verificar se PostgreSQL está rodando

**Windows:**
- Abra o **Gerenciador de Tarefas**
- Procure por processos `postgres.exe`
- Se não encontrar, inicie o serviço:
  - Menu Iniciar → Serviços → PostgreSQL → Iniciar

## 📝 Resumo dos Comandos

```bash
# 1. Instalar dependências
npm install

# 2. Gerar Prisma Client
npm run db:generate

# 3. Criar tabelas (migration)
npm run db:migrate

# 4. (Opcional) Abrir Prisma Studio para visualizar dados
npm run db:studio
```

## ✅ Checklist

- [ ] PostgreSQL instalado
- [ ] Banco `lazzyfinance` criado
- [ ] Arquivo `.env.local` criado
- [ ] `DATABASE_URL` configurada no `.env.local`
- [ ] `npm install` executado
- [ ] `npm run db:generate` executado
- [ ] `npm run db:migrate` executado com sucesso
- [ ] Tabela `transactions` criada no banco

## 💡 Dicas

1. **Guarde a senha**: Você vai precisar dela sempre que configurar conexões
2. **pgAdmin**: Use para visualizar dados facilmente
3. **Prisma Studio**: Alternativa moderna ao pgAdmin, mais simples
4. **Backup**: Considere fazer backup do banco periodicamente
