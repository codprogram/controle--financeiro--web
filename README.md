# Controle Financeiro Web

Versao web do seu controle financeiro pessoal, pensada para rodar no navegador do Mac e do iPhone.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Modos de persistencia

- Sem variaveis de ambiente: salva localmente no navegador
- Com Supabase configurado: salva na nuvem e pode ser usado em varios dispositivos

## Variaveis de ambiente

Crie um arquivo `.env.local` com base em `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Banco no Supabase

1. Crie um projeto no Supabase
2. Abra o SQL Editor
3. Rode o conteudo de `supabase-schema.sql`
4. Rode o conteudo de `supabase-auth.sql`

## Deploy na Vercel

1. Suba a pasta `web` para o GitHub
2. Importe o repositorio na Vercel
3. Em `Project Settings > Environment Variables`, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Faça o deploy

## Autenticacao

A tela web agora suporta:

- criar conta com email e senha
- login com email e senha
- leitura e escrita isoladas por usuario com RLS

Antes de publicar, ative `Email` em `Supabase > Authentication > Providers`.
