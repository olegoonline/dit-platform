<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# DIT Platform — Agent context

Этот файл — быстрый on-ramp для AI-агента, работающего в репо. Структура: чего избегать,
как устроена архитектура, какие конвенции уже устоялись, где что лежит.

Глубокий обзор фич — см. `PLATFORM_OVERVIEW.md`.
Партнёрский UX — `PARTNER_GUIDE.md`.

---

## Stack

- **Next.js 16** (Turbopack, React 19) — см. warning выше про кастомный билд
- **Supabase** — Postgres + Auth + Row-Level Security + Storage
- **Ant Design v6** — только в admin/partner-зоне
- **Resend** — транзакционная почта
- **Hosting**: VPS под pm2 (см. раздел Deploy)

---

## Архитектура: route groups

```
src/app/
├── (panel)/         # AntD-зона: auth-protected админка + партнёрка + личный кабинет гостя
│   ├── admin/       # role='admin'
│   ├── partner/     # role='partner' + partner_property_id
│   ├── me/          # role='user' (guest self-service)
│   ├── login/
│   ├── matched/[id] # пост-WBS landing (anonymous OK по id)
│   └── api/         # все API routes
├── (public)/        # Botanical Luxe public: без AntD, чистый CSS
│   ├── page.tsx     # Home
│   ├── programs/
│   ├── about/
│   ├── start/       # WBS chat-assessment
│   └── landing.css  # design tokens + компонентные стили
└── layout.tsx       # минимальный root, без AntD
```

**Host routing — `src/proxy.ts`:**
- `dreamislands.org` → `(public)/*`
- `panel.dreamislands.org` → `(panel)/*` + API
- Списки `PANEL_HOST_ALLOWED` и `PUBLIC_HOST_ALLOWED` определяют какие пути ловит каждый хост.
  При добавлении нового route — обнови соответствующий список.

---

## Конвенции

### AntD — только в `(panel)`
Интерактивные AntD компоненты (`<Button onClick>`, `<Modal>`, `<Form>` и т.п.)
**обязаны** быть внутри `"use client"`. Использование в server component компилится
локально, но на проде → 500 (`document is not defined`). На публичных страницах
AntD вообще нет — там raw CSS из `landing.css`.

### Server-side Supabase
- `src/lib/supabase-server.ts` экспортит `supabaseAdmin` (service role, bypass RLS) и `getSession()`
- В API/server components: сначала проверяй auth через `getSession()`, затем используй `supabaseAdmin`
- **Service role никогда не попадает в client bundle** (`SUPABASE_SERVICE_ROLE_KEY` без `NEXT_PUBLIC_`)

### RLS pattern
- Helpers в DB: `current_user_role()`, `current_user_property()`
- Любая **property-связанная таблица** требует RLS-политики, scoped через `current_user_property()` — иначе партнёр увидит чужое
- Reference: миграция `14_partner_data_scoping.sql`
- Defense-in-depth: RLS в БД + filter в API + UI hidden (не полагайся только на UI)

### View security
- Партнёрские view (`partner_program_outcomes` и т.п.):
  - **С агрегацией и собственным scope** → `security_invoker=off` + inline `where … = current_user_property()`
  - **Без агрегации, row-pass-through** → `security_invoker=on` (RLS базовой таблицы применится автоматом)

### Миграции
- DDL — `supabase-migrations/NN_description.sql` (последовательная нумерация)
- Применять через `mcp__supabase__apply_migration` — НЕ через `psql` CLI
- **Одна общая БД** для local и prod: применение миграции = patches production
- Sequence на момент initial commit: 01..16

### Audit log (`user_revisions`)
- Append-only история правок `public.users`
- Запись на **API-уровне** (не через DB trigger) — даёт контроль над snapshot-моментом
- Каждая правка: full before-snapshot + JSON diff + edited_by + timestamp
- Правки не уничтожают данные — admin может восстановить из revision

### Magic-link / auth
- Поток: `signInWithOtp(email)` → клик в почте → `/auth/callback` → PKCE exchange
- **НЕ используй `admin.generateLink`** — это для confirmation flows, ломает PKCE
- Custom SMTP в Supabase Dashboard обязателен для prod (встроенный sender = 3 emails/час)

### Email (Resend)
- `src/lib/email.ts` → `sendEmail({ to, subject, html, text? })`
- Транзакционка через Resend HTTP API
- Magic-link через custom SMTP конфиг в Supabase Auth (тоже Resend, но как SMTP relay)

### Пароли
- Хранятся как bcrypt-хэши в Supabase Auth — **plaintext нигде не хранится и не восстановим**
- Админ может только **сбросить** (через `auth.admin.updateUserById`), не «посмотреть»
- При сбросе плейн показывается **один раз** в UI, флаг `profiles.password_set_by_admin=true`
- Вариант хранить decryptable копию обсуждался и отвергнут как security liability

### Cloudflare + certbot
- DNS-записи для `dreamislands.org` / `panel.dreamislands.org` — **серое облачко** (DNS only)
- Оранжевое облачко проксирует трафик через CF → certbot HTTP-01 не сможет валидировать
- При renewal letsencrypt: облачко должно быть серым

### Brand
- `src/components/Logo.tsx` — inline SVG (плюмерия), `fill=currentColor`
- Tint через CSS `color`: green `#1D9E75` (panel) или `var(--accent)` `#2F8F6E` (public)
- Папка `/logo/Union.svg` — source-of-truth картинки, но в коде уже inline'ена

---

## Booking lifecycle

```
inquiry → confirmed → active → completed
   ↓         ↓          ↓
   cancelled (any non-terminal)
```

- `start_stay` (confirmed → active) требует `pre_wbs` (gated через prompt-modal в UI)
- `complete` (active → completed) требует `post_wbs`
- Backward transitions заблокированы на API-уровне. Admin escape: прямой PATCH через старый Status select
- Trigger `set_booking_timestamps` авто-стампит `confirmed_at` / `started_at` / `completed_at` / `cancelled_at`
- Side effects: email на confirm/cancel, intake notification → admin

---

## WBS (Wellness Baseline Score)

- 23 вопроса в `src/lib/wbs.ts` — единственный source-of-truth
- 7 секций → 4 sub-score (Movement / Recovery / Lifestyle / Emotional) → total 0..100
- Cohort 1..3 по total: ≥70 Reset, ≥50 Performance, <50 Longevity
- Q22 (CVD) и Q23 (cancer) флаги — показывают warning баннер + email админу
- `computeWbs(answers)` возвращает `{ total, subs, cohort, recommendation, flags }`
- POST `/api/intake` принимает result + контакт → создаёт `public.users` → находит 3 matched-programs → email
- Дополнительно: ежедневный rail 30 дней — `users.wbs_started_at` + `user_wbs_daily` (миграция 16)

---

## Где что лежит

| Что | Путь |
|---|---|
| Admin panel | `src/app/(panel)/admin/*` |
| Partner panel | `src/app/(panel)/partner/*` |
| Guest self-service | `src/app/(panel)/me/*` |
| API routes | `src/app/(panel)/api/*` |
| Public site | `src/app/(public)/*` |
| Botanical design tokens | `src/app/(public)/landing.css` |
| WBS logic | `src/lib/wbs.ts` |
| Server-side Supabase | `src/lib/supabase-server.ts` |
| Email (Resend) | `src/lib/email.ts` |
| Auth helpers | `src/lib/auth.ts` |
| Host routing | `src/proxy.ts` |
| Migrations | `supabase-migrations/NN_*.sql` |
| Logo SVG | `src/components/Logo.tsx` (inline) |

---

## Deploy

- **VPS**: `root@103.76.180.236:/opt/dit-platform`, pm2 process `dit`
- **Pipeline**:
  1. `rsync` `src/` + `supabase-migrations/` + `package*.json` → VPS
  2. `ssh` → `npm install` (только если изменился `package-lock.json`)
  3. `npx next build`
  4. `pm2 restart dit --update-env`
- После правки `.env.local` на VPS: `pm2 restart dit --update-env` обязательно (иначе env не подхватится)
- Логи: `pm2 logs dit` или `/root/.pm2/logs/dit-{out,error}.log`

Сейчас deploy ручной (rsync). Возможный апгрейд — переключить на git pull-deploy
с deploy-key, но это отдельная задача.

---

## Env vars

- См. `.env.example` для полного списка ключей + где их брать
- Реальные значения — `.env.local` (gitignored)
- **Никогда не вставляй секреты** в чат / коммиты / shell output. Для отображения переменных используй `sed 's/=.*/=<redacted>/'`
- `INTAKE_WEBHOOK_SECRET` общий с curatools — **не ротировать без координации**
- `SUPABASE_SERVICE_ROLE_KEY` server-only — никогда не попадает в client

---

## Don't do

- Не добавляй error handling / fallbacks / валидацию для невозможных кейсов
- Не добавляй фичи / абстракции / refactor сверх того, что просили
- Не пиши комментарии «что делает код» — пиши только «почему» когда не очевидно
- Не используй AntD в `(public)/*` — там raw CSS
- Не используй `psql`-CLI для миграций — только MCP `apply_migration`
- Не вставляй секреты в shell output / commits / chat
- Не добавляй admin-email в новые места — единственный источник правды это trigger `handle_new_user` в миграции 01

---

## Memory references

Локальная auto-memory Claude Code (не в git, специфична для машины) содержит
подробные feedback-заметки по конкретным граблям. Имена слугов:

- `feedback_partner_rls_scope` — паттерн scoped RLS, миграция 14
- `feedback_view_security_pattern` — когда `security_invoker=on/off`
- `feedback_magic_link_pkce` — почему НЕ admin.generateLink
- `feedback_antd_button_server` — почему interactive AntD только в client
- `feedback_audit_pattern` — append-only, API-layer write
- `feedback_migration_workflow` — MCP, не psql
- `feedback_password_management` — bcrypt-only, никакого plaintext
- `feedback_cloudflare_proxy_certbot` — серое облачко
- `feedback_nextjs_custom` — кастомный Next.js, читать node_modules доки
- `feedback_bazzite_install` — машина основного разработчика на immutable Fedora: brew/flatpak/rpm-ostree/distrobox, НЕ dnf

Этот файл (`AGENTS.md`) дублирует ключевую часть их содержимого, чтобы новый
Claude на свежей машине сразу имел контекст без памяти.
