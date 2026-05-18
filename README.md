# 🛂 H-2 Visa Scanner Pro

Varredura inteligente de vagas **H-2A** (agrícolas) e **H-2B** (não-agrícolas) com validação de documentação DOL e suporte a múltiplos motores de IA.

---

## ✨ Funcionalidades

- **H-2A** — 8 setores agrícolas: colheita, pecuária, pomares, viveiros, aquicultura, silvicultura, laticínios
- **H-2B** — 8 setores não-agrícolas: hotelaria, paisagismo, parques, seafood, ski, acampamentos, construção
- Validação de certificação DOL (ETA-9142A / ETA-9142B) em tempo real
- Indicador de risco por empresa (LOW / MEDIUM / HIGH)
- Exportação CSV e JSON
- Histórico das últimas 10 buscas

### 🤖 Provedores de IA suportados

| Provedor | Modelos | Chave necessária |
|---|---|---|
| **Anthropic** | Claude Sonnet 4, Haiku 4.5 | `sk-ant-...` |
| **OpenRouter** | Gemini, GPT-4o, Llama, DeepSeek + 200 outros | `sk-or-v1-...` |
| **OpenAI** | GPT-4o, GPT-4o Mini, GPT-4 Turbo | `sk-...` |

---

## 🚀 Início rápido

### Pré-requisitos
- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/)
- Pelo menos **1 chave de API** de qualquer provedor acima

### 1. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas chaves:

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-v1-...
OPENAI_API_KEY=sk-...
```

### 2. Subir em produção

```bash
# Com Make (recomendado)
make up

# Ou diretamente com Docker Compose
docker compose up -d --build
```

Acesse: **http://localhost:3001**

### 3. Parar

```bash
make down
# ou
docker compose down
```

---

## 🛠️ Modo Desenvolvimento (hot reload)

```bash
make dev
# ou
docker compose --profile dev up --build
```

- Frontend com hot-reload: **http://localhost:3000**
- Backend proxy: **http://localhost:3001**

Edite `client/src/App.jsx` — as alterações aparecem automaticamente no browser.

---

## 📁 Estrutura do Projeto

```
h2-visa-scanner/
├── Dockerfile              # Build de produção (multi-stage)
├── Dockerfile.dev          # Build de desenvolvimento
├── docker-compose.yml      # Orquestração dos serviços
├── Makefile                # Atalhos de comandos
├── server.js               # Express proxy server (Node.js)
├── package.json            # Dependências do servidor
├── .env.example            # Exemplo de variáveis de ambiente
│
└── client/                 # Frontend React + Vite
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        └── App.jsx         # Aplicação principal
```

---

## 🔒 Segurança

- As chaves de API são armazenadas **apenas no servidor proxy** e nunca expostas ao browser
- O container roda como usuário **não-root** (`appuser`)
- As chaves podem ser passadas via arquivo `.env` ou variáveis de ambiente do sistema

---

## 🌐 Arquitetura

```
Browser → Frontend React (porta 3000/3001)
             ↓
         Express Proxy (/api/anthropic, /api/openrouter, /api/openai)
             ↓
    APIs Externas (Anthropic / OpenRouter / OpenAI)
             ↓
    Resultados com validação DOL
```

O proxy evita exposição das chaves no frontend e resolve problemas de CORS.

---

## ⚙️ Comandos Make

```bash
make setup    # Cria .env (execute na primeira vez)
make up       # Produção — http://localhost:3001
make dev      # Desenvolvimento com hot reload
make down     # Para os containers
make logs     # Acompanha logs ao vivo
make restart  # Reinicia o servidor
make clean    # Remove tudo (containers + imagens)
```

---

## 🔧 Variáveis de Ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta do servidor proxy | `3001` |
| `NODE_ENV` | Ambiente (`production`/`development`) | `production` |
| `ANTHROPIC_API_KEY` | Chave Anthropic | — |
| `OPENROUTER_API_KEY` | Chave OpenRouter | — |
| `OPENAI_API_KEY` | Chave OpenAI | — |

---

## 📄 Licença

MIT — use à vontade para fins pessoais e comerciais.
