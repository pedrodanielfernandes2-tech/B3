# Painel B3

Dashboard de análise técnica de ações da B3 (médias móveis + RSI), com cotações via
[brapi.dev](https://brapi.dev) (fallback: [bolsai](https://usebolsai.com)), acompanhamento
de carteira, e alertas por notificação push (funcionam mesmo com o app fechado).

## Rodar localmente

```bash
npm install
npm run dev
```

## Publicar na Vercel

1. Suba esta pasta para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → selecione o repositório → **Deploy**.
   A Vercel detecta Vite automaticamente.

Isso já publica o site e o dashboard de cotações funcionando. Os alertas por notificação
push (abaixo) são opcionais e exigem mais três passos.

## Ativar alertas por notificação push (opcional)

Isso permite receber um aviso no celular/navegador mesmo com o app fechado, quando um papel
muda de sinal técnico ou bate um preço-alvo que você configurar. Requer três serviços externos
gratuitos, além do próprio projeto na Vercel.

### 1. Criar as tabelas no Supabase (grátis, você já tem conta)

1. Abra seu projeto no [supabase.com](https://supabase.com) → **SQL Editor → New query**.
2. Cole o conteúdo do arquivo `supabase/schema.sql` (incluso neste projeto) e clique em **Run**.
   Isso cria as duas tabelinhas que guardam quem quer alerta de quê.
3. Vá em **Project Settings → API**. No topo da página copie a **Project URL**. Depois, na
   seção **"Secret keys"** (aba "Publishable and secret API keys"), copie a chave `default`
   que começa com `sb_secret_...` — clique no ícone do olho para revelar o valor completo.
   Essa é a chave privada, que nunca deve ser exposta ao navegador (se a interface da Supabase
   ainda mostrar a aba antiga "Legacy anon, service_role API keys" no seu projeto, a chave
   `service_role` de lá funciona do mesmo jeito).

### 2. Configurar as variáveis de ambiente na Vercel

No projeto na Vercel: **Settings → Environment Variables**, adicione uma por uma (valores no
arquivo `.env.example` deste projeto — as chaves VAPID já vêm prontas):

| Nome | De onde vem |
|---|---|
| `VITE_VAPID_PUBLIC_KEY` | já pronto em `.env.example` |
| `VAPID_PRIVATE_KEY` | já pronto em `.env.example` |
| `CRON_SECRET` | já pronto em `.env.example` (ou gere o seu: qualquer string aleatória longa) |
| `SUPABASE_URL` | Project Settings → API, no seu projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API, chave "service_role" |

Depois de salvar, faça um **redeploy** do projeto (Deployments → ⋯ → Redeploy) para as
variáveis entrarem em vigor.

### 3. Criar o agendador no cron-job.org (grátis)

1. Crie uma conta em [console.cron-job.org](https://console.cron-job.org).
2. Crie um novo cronjob apontando para:
   `https://SEU-SITE.vercel.app/api/check-alerts?secret=SEU_CRON_SECRET`
   (troque `SEU-SITE` pelo domínio real e `SEU_CRON_SECRET` pelo mesmo valor que você colocou
   na variável `CRON_SECRET` da Vercel).
3. Configure o intervalo de execução — a cada 5 minutos é um bom equilíbrio entre agilidade e
   uso da cota das APIs de cotação.
4. Salve e rode uma execução de teste (botão "Run now" / "Executar agora") para conferir que
   retorna `{"ok": true, ...}`.

### 4. Ativar no app

Abra o app publicado, clique no ícone de engrenagem (⚙️), configure os alertas desejados em
cada papel (mudança de sinal e/ou preço-alvo) e clique em **"Ativar alertas por notificação"**.
O navegador vai pedir permissão de notificação — aceite.

## Observação sobre cotações

Sem token, apenas PETR4, VALE3, ITUB4 e MGLU3 funcionam (papéis de teste gratuitos da brapi.dev).
Para liberar qualquer outro papel da B3, gere um token grátis em brapi.dev e cole nas
configurações (ícone de engrenagem) dentro do próprio app.

