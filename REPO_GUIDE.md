# DIT Platform — repo guide for agents

Короткая точка входа для любого AI-агента или нового разработчика, открывшего этот репозиторий.
Здесь — карта: что это, из чего состоит, куда смотреть дальше. Глубина — в специализированных доках (ссылки ниже).

> ⚠️ **Next.js здесь нестандартный.** Версия 16 (Turbopack, React 19) с breaking changes относительно
> того, что может быть в твоих тренировочных данных. Перед написанием кода читай актуальные доки в
> `node_modules/next/dist/docs/`, а не полагайся на память.

---

## Что это

Платформа Dream Islands Travel (DIT): wellness-ассессмент гостей (WBS) + подбор оздоровительных
программ + админка/партнёрка/личный кабинет гостя. Публичный сайт + защищённая панель в одном Next.js-приложении,
разведённые по хостам.

## Стек

- **Next.js 16** (Turbopack, React 19)
- **Supabase** — Postgres + Auth + Row-Level Security + Storage
- **Ant Design v6** — только в панели (`(panel)`), на публичных страницах raw CSS
- **Resend** — транзакционная почта
- **Хостинг** — VPS под pm2 (деплой вручную через rsync, см. ниже)

## Структура (route groups)

```
src/app/
├── (panel)/     # AntD-зона под auth: admin / partner / me (гость) + login + api
└── (public)/    # Botanical Luxe публичный сайт без AntD, чистый CSS (landing.css)
```

Host-routing — `src/proxy.ts`: `dreamislands.org` → `(public)`, `panel.dreamislands.org` → `(panel)` + API.

## Где что лежит

| Что | Путь |
|---|---|
| Admin / Partner / Guest панели | `src/app/(panel)/{admin,partner,me}/*` |
| API routes | `src/app/(panel)/api/*` |
| Публичный сайт | `src/app/(public)/*` |
| Design tokens (публичка) | `src/app/(public)/landing.css` |
| WBS-логика (23 вопроса, scoring) | `src/lib/wbs.ts` |
| Server-side Supabase (service role + getSession) | `src/lib/supabase-server.ts` |
| Email (Resend) | `src/lib/email.ts` |
| Host-routing | `src/proxy.ts` |
| Миграции БД | `supabase-migrations/NN_*.sql` |

## Деплой (вручную, не через GitHub)

GitHub — только хранилище кода. На прод выкатывается **напрямую с машины разработчика**:

1. `rsync` `src/` + `supabase-migrations/` + `package*.json` → `root@<VPS>:/opt/dit-platform`
2. `ssh` → `npm install` (только если изменился `package-lock.json`)
3. `npx next build`
4. `pm2 restart dit --update-env`

CI/CD с git-pull пока нет — это возможный апгрейд на будущее.

## Ключевые конвенции (не нарушай)

- Интерактивный AntD (`onClick`, `<Modal>`, `<Form>`) — **только в `"use client"`**, иначе прод → 500.
- AntD **нельзя** в `(public)/*` — там только raw CSS.
- Любая property-связанная таблица требует **RLS-политики** через `current_user_property()` (защита партнёрских данных).
- Миграции применять **только** через Supabase MCP `apply_migration`, **не** через `psql` CLI. БД одна для local и prod — миграция сразу патчит прод.
- Секреты (`.env.local`) не коммитить; `SUPABASE_SERVICE_ROLE_KEY` — server-only, не попадает в client bundle.
- Magic-link auth — `signInWithOtp`, **не** `admin.generateLink` (ломает PKCE).

## Дальше читать

- **`AGENTS.md`** — детальный on-ramp для агента: архитектура, конвенции, грабли, «don't do».
- **`PLATFORM_OVERVIEW.md`** — обзор фич платформы.
- **`PARTNER_GUIDE.md`** — партнёрский UX.
- **`README.md`** — краткий старт.
- **`CLAUDE.md`** — инструкции для Claude Code (инклудит `AGENTS.md`).
