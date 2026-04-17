# Audiobook Player 🎧

Player de audiobooks com upload de MP3/M4B, reconhecimento de capítulos, bookmarks, tracking de progresso e sincronização entre dispositivos via Supabase.

## Setup

### 1. Criar projeto Supabase (grátis)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta/projeto
2. Vá em **SQL Editor** e cole o conteúdo de `supabase-setup.sql` para criar a tabela e storage
3. Vá em **Authentication > Providers** e habilite:
   - **GitHub** (não precisa de OAuth app, o Supabase tem um built-in)
   - **Google** (opcional, precisa de OAuth credentials no Google Cloud Console)
4. Vá em **Settings > API** e copie a **URL** e **anon key**

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha `.env` com sua URL e anon key do Supabase.

### 3. Instalar e rodar

```bash
npm install
npm run dev
```

### 4. Deploy para GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create audiobook-player --public --source=. --push
npm run build
npm run deploy
```

Depois, vá em **Settings > Pages** do repo e configure a source como `gh-pages` branch.

## Features

- **Upload** de MP3, M4B, M4A, AAC, OGG, OPUS
- **Player** com controles avançados (play/pause, skip ±15s/30s/60s)
- **Velocidade** ajustável (0.5x a 3x)
- **Capítulos** extraídos automaticamente de M4B
- **Bookmarks** manuais com posição exata
- **Progresso** salvo automaticamente a cada 5s
- **Sincronização** entre dispositivos via Supabase
- **OAuth** com GitHub/Google
- **UI** dark mode moderna e responsiva
