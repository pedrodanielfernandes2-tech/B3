# Painel B3

Dashboard de análise técnica de ações da B3 (médias móveis + RSI), com cotações via [brapi.dev](https://brapi.dev).

## Rodar localmente

```bash
npm install
npm run dev
```

## Publicar na Vercel

**Opção A — pelo site (mais fácil, sem terminal):**

1. Suba esta pasta para um repositório no GitHub (crie um repo novo e faça upload dos arquivos, ou use `git push`).
2. Entre em [vercel.com](https://vercel.com), clique em **Add New → Project**.
3. Selecione o repositório. A Vercel detecta automaticamente que é um projeto Vite — não precisa mudar nenhuma configuração.
4. Clique em **Deploy**. Em ~1 minuto você recebe uma URL tipo `painel-b3.vercel.app`.

**Opção B — pelo terminal (sem precisar do GitHub):**

```bash
npm install -g vercel
cd painel-b3
vercel
```

Siga as perguntas (login, nome do projeto) e ele já publica direto.

## Observação sobre cotações

Sem token, apenas PETR4, VALE3, ITUB4 e MGLU3 funcionam (papéis de teste gratuitos da brapi.dev).
Para liberar qualquer outro papel da B3, gere um token grátis em brapi.dev e cole nas
configurações (ícone de engrenagem) dentro do próprio app — ele fica salvo no seu navegador.
