# 🔄 Guia de Migração para Multi-Usuário

Este guia explica como migrar o banco de dados para suportar múltiplos usuários com isolamento de dados.

## ⚠️ IMPORTANTE

**Esta migração irá DELETAR todas as transações existentes** para garantir que não haja dados órfãos sem usuário associado.

## 📋 Passo a Passo

### 1. Fazer backup (opcional, mas recomendado)

Se você tem dados importantes que quer manter:

```bash
# No pgAdmin ou SQL Shell, exporte os dados:
pg_dump -U postgres -d lazzyfinance > backup_antes_migration.sql
```

### 2. Deletar dados antigos (se houver)

Execute no SQL Shell ou pgAdmin:

```sql
-- Conecte ao banco lazzyfinance
\c lazzyfinance

-- Deleta todas as transações existentes
DELETE FROM transactions;
```

### 3. Gerar a migration do Prisma

```bash
npm run db:generate
```

### 4. Criar e aplicar a migration

```bash
npm run db:migrate
```

Quando perguntar o nome da migration, use: `add_user_and_multi_user_support`

### 5. Verificar se funcionou

```bash
# Abre o Prisma Studio para verificar
npm run db:studio
```

Você deve ver:
- ✅ Tabela `users` criada
- ✅ Tabela `transactions` com campo `user_id`
- ✅ Relacionamento entre as tabelas

## 🧪 Testar

1. Inicie o bot: `npm run dev`
2. Envie `/start` no Telegram
3. Registre uma transação
4. Verifique no Prisma Studio que a transação tem um `user_id` associado

## 🔍 Verificações de Segurança

### Garantir isolamento de dados

Todas as queries agora filtram por `userId`:

```typescript
// ✅ CORRETO - Filtra por userId
prisma.transaction.findMany({
  where: { userId: usuario.id }
})

// ❌ ERRADO - Não filtra (não existe mais no código)
prisma.transaction.findMany()
```

### Verificar no código

Certifique-se de que todas as funções em `transaction.service.ts` recebem `userId`:

- ✅ `criarTransacao(userId, ...)`
- ✅ `buscarTransacoesPorMes(userId, ...)`
- ✅ `gerarRelatorioMensal(userId, ...)`

## 📊 Estrutura Final

### Tabela `users`
- `id` (UUID) - ID interno
- `telegram_id` (BigInt, único) - ID do Telegram
- `first_name` - Nome do usuário
- `last_name` - Sobrenome
- `username` - @username do Telegram
- `language_code` - Idioma preferido
- `criado_em` - Data de cadastro
- `atualizado_em` - Última atualização

### Tabela `transactions`
- `id` (UUID) - ID interno
- `user_id` (UUID) - **NOVO** - Referência ao usuário
- `valor` - Valor da transação
- `categoria` - Categoria
- `descricao` - Descrição
- `data_gasto` - Data
- `nota` - Nota opcional
- `criado_em` - Data de criação
- `atualizado_em` - Última atualização

### Índices Criados
- `user_id` - Para buscas rápidas por usuário
- `(user_id, data_gasto)` - Para relatórios mensais otimizados

## 🐛 Troubleshooting

### Erro: "Foreign key constraint fails"

Isso significa que há transações sem usuário. Execute:

```sql
DELETE FROM transactions;
```

E depois execute a migration novamente.

### Erro: "Column user_id does not exist"

A migration não foi aplicada. Execute:

```bash
npm run db:migrate
```

### Erro: "User not found"

O usuário precisa usar `/start` primeiro para se registrar.

## ✅ Checklist

- [ ] Backup feito (opcional)
- [ ] Dados antigos deletados
- [ ] `npm run db:generate` executado
- [ ] `npm run db:migrate` executado com sucesso
- [ ] Tabela `users` criada
- [ ] Campo `user_id` adicionado em `transactions`
- [ ] Bot testado com `/start`
- [ ] Transação de teste criada
- [ ] Verificado isolamento de dados no Prisma Studio

## 🎉 Pronto!

Agora cada usuário só vê suas próprias transações. O sistema está seguro e isolado!
