# Charlène

Boekings- en website-platform voor Charlène's kapsalon.

Gebaseerd op het Jeanine-platform, met bruidsstyling-functionaliteit
verwijderd en neutrale branding als startpunt.

## Setup

```bash
pnpm install
cp .env.local.example .env.local   # vul de echte sleutels in
pnpm dev
```

## Stack

- Next.js 16 (App Router)
- TypeScript strict
- Supabase Postgres + Auth + Storage
- Tailwind CSS + shadcn/ui
- zod + react-hook-form
- pdf-lib voor facturen
- Resend voor mail
