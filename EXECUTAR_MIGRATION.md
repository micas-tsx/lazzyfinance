# 🚀 Executar Migration - Passo a Passo Rápido

## ⚠️ ATENÇÃO: Isso vai deletar todas as transações existentes!

## Passos:

### 1. Deletar transações antigas (se houver)

Abra o **SQL Shell (psql)** ou **pgAdmin** e execute:

```sql
-- Conecte ao banco
\c lazzyfinance

-- Deleta todas as transações
DELETE FROM transactions;
```

### 2. Executar a migration

No terminal, na pasta do projeto:

```bash
npm run db:migrate
```

Quando perguntar o nome da migration, digite:
```
add_user_and_multi_user_support
```

### 3. Verificar se funcionou

```bash
npm run db:studio
```

Você deve ver:
- ✅ Tabela `users` criada
- ✅ Tabela `transactions` com campo `user_id`

### 4. Testar o bot

```bash
npm run dev
```

Envie `/start` no Telegram e teste registrando uma transação!

---

## Se der erro de permissão novamente:

```bash
# Limpa o cache do Prisma
Remove-Item -Recurse -Force node_modules\.prisma

# Gera novamente
npm run db:generate

# Tenta a migration novamente
npm run db:migrate
```
