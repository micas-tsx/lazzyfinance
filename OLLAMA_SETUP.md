# 🦙 Guia de Configuração do Ollama

## O que é Ollama?

Ollama é uma ferramenta que permite executar modelos de IA localmente, de forma gratuita e sem necessidade de internet (após baixar o modelo).

## 📥 Instalação

### Windows

1. Acesse: https://ollama.ai/download
2. Baixe o instalador para Windows
3. Execute o instalador e siga as instruções
4. O Ollama será instalado como um serviço e iniciará automaticamente

## 🚀 Configuração Inicial

### 1. Verificar se está funcionando

Abra o terminal/CMD e execute:

```bash
ollama --version
```

Se mostrar a versão, está instalado corretamente!

### 2. Baixar um modelo

Você precisa baixar um modelo de IA. Recomendações:

**Para começar (mais leve):**
```bash
ollama pull llama2
```

**Alternativa (melhor qualidade):**
```bash
ollama pull mistral
```

**Outra opção (boa qualidade):**
```bash
ollama pull codellama
```

⚠️ **Atenção**: O download pode levar alguns minutos e ocupar alguns GB de espaço.

### 3. Testar o modelo

Depois de baixar, teste:

```bash
ollama run llama2
```

Isso abrirá um chat interativo. Digite algo como "Olá" e veja a resposta.

Para sair, digite `/bye` ou pressione `Ctrl+C`.

### 4. Verificar se o servidor está rodando

O Ollama deve iniciar automaticamente. Para verificar:

**Windows:**
- Abra o Gerenciador de Tarefas e procure por "Ollama"

**Linux/macOS:**
```bash
ollama list
```

Se mostrar uma lista (mesmo que vazia), está funcionando!

Se não estiver rodando, inicie manualmente:

```bash
ollama serve
```

## 🔧 Configuração do Projeto

No arquivo `.env.local`, configure:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

**Nota**: Se você baixou outro modelo (ex: mistral), altere `OLLAMA_MODEL` para o nome do modelo baixado.

## 🧪 Testar a API

Para testar se a API está funcionando, você pode fazer uma requisição manual:

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "Olá",
  "stream": false
}'
```

Ou usando PowerShell (Windows):

```powershell
Invoke-RestMethod -Uri http://localhost:11434/api/generate -Method Post -ContentType "application/json" -Body '{"model":"llama2","prompt":"Olá","stream":false}'
```

## ❓ Troubleshooting

### "Erro ao conectar com Ollama"

1. Verifique se o Ollama está rodando:
   ```bash
   ollama list
   ```

2. Se não estiver, inicie:
   ```bash
   ollama serve
   ```

3. Verifique se a porta 11434 está acessível:
   - Abra: http://localhost:11434 no navegador
   - Deve mostrar uma mensagem de erro (mas significa que está respondendo)

### "Modelo não encontrado"

1. Liste os modelos baixados:
   ```bash
   ollama list
   ```

2. Se não houver modelos, baixe um:
   ```bash
   ollama pull llama2
   ```

3. Verifique se o nome do modelo no `.env.local` está correto

### "Resposta muito lenta"

Os modelos podem ser lentos dependendo do seu hardware:
- **Solução 1**: Use um modelo menor (ex: `llama2:7b` ao invés de `llama2`)
- **Solução 2**: Melhore o hardware (mais RAM, CPU melhor)
- **Solução 3**: Use uma GPU se disponível (Ollama detecta automaticamente)

### Modelos mais leves (menor consumo de memória)

Se você tiver pouca RAM, tente modelos menores:

```bash
ollama pull llama2:7b      # ~4GB RAM
ollama pull mistral:7b     # ~4GB RAM
ollama pull phi:2.7b       # ~2GB RAM (bem leve!)
```

## 📚 Recursos Úteis

- Site oficial: https://ollama.ai
- Modelos disponíveis: https://ollama.ai/library
- Documentação: https://github.com/ollama/ollama

## 💡 Dicas

1. **Primeiro uso**: Pode ser mais lento enquanto o modelo é carregado na memória
2. **Memória**: Modelos grandes precisam de mais RAM (8GB+ recomendado)
3. **Internet**: Só precisa de internet para baixar modelos, depois funciona offline
4. **Performance**: Se tiver GPU NVIDIA/AMD, o Ollama usa automaticamente (muito mais rápido!)
