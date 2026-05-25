# DIT Platform

Next.js 16 + Supabase для Dream Islands Travel (wellness retreats).
Подробное описание платформы — см. `PLATFORM_OVERVIEW.md`. Партнёрский воркфлоу — `PARTNER_GUIDE.md`.

## Local setup

```bash
git clone git@github.com:<owner>/dit-platform.git
cd dit-platform
npm install
cp .env.example .env.local
# заполнить .env.local реальными ключами (см. ниже)
npm run dev
```

Откроется http://localhost:3000.

### Где брать ключи для `.env.local`

- `NEXT_PUBLIC_SUPABASE_*` и `SUPABASE_SERVICE_ROLE_KEY` — Supabase dashboard → Settings → API
- `RESEND_API_KEY` — Resend dashboard → API Keys
- `INTAKE_WEBHOOK_SECRET` — общий с интеграцией curatools (не регенерировать без координации)

## Migrations

DDL — в `supabase-migrations/NN_*.sql` (последовательная нумерация). Применять через
Supabase MCP (`mcp__supabase__apply_migration`) или вручную в SQL editor. См. `supabase-migrations/README.md`.

## Deploy

VPS: `root@103.76.180.236:/opt/dit-platform`, процесс `dit` под pm2.
Pipeline: `rsync` (`src/` + `supabase-migrations/`) → `ssh` → `npm install` (если изменился
`package-lock.json`) → `npm run build` → `pm2 restart dit`.

## Stack

- Next.js 16 — route groups: `(panel)` под AntD, `(public)` чистый CSS (Botanical Luxe)
- Supabase — Postgres + Auth + RLS + Storage
- Email — Resend
- Host-routing через `src/proxy.ts`: `dreamislands.org` → public, `panel.dreamislands.org` → admin/partner
