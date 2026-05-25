# DIT Platform — обзор функций и план развития

**Прод:** `https://panel.dreamislands.org`
**Стек:** Next.js 16 (Turbopack) + Supabase (Postgres + Auth + RLS) + Ant Design v6
**Статус:** Tier 1 + Tier 2 + Tier 3 закрыты и задеплоены.

---

## 1. Публичная воронка (anonymous)

Любой пользователь без логина видит:

### `/` — Landing
- Hero-блок с описанием платформы и CTA «Take the assessment»
- Каталог активных программ с фильтром по когорте (Reset / Performance / Mind / Immersion)
- WhatsApp deep-link с pre-filled сообщением на каждой карточке программы

### `/start` — WBS-опрос
Подробнее в разделе 4 ниже. Открыт без авторизации. Результат отправляется на `/api/intake`, создаёт запись в `public.users`, редиректит на `/matched/[id]`.

### `/matched/[id]` — Результат опроса
- Большой WBS-score 0–100
- Рекомендация (Reset & Recovery / Performance & Energy / Longevity & Balance)
- 4 sub-score с progress-bars (Movement, Recovery, Lifestyle Risk, Emotional)
- Warning баннер при CVD/cancer flag
- 3 matched-программы с двумя CTA на каждой:
  - **Reserve dates** — открывает DatePicker + pax → создаёт inquiry в `bookings` со статусом `inquiry`
  - **Or chat on WhatsApp** — pre-filled deep-link на property's contact

### `/login` — Вход
- Tab **Password** — обычный email + password
- Tab **Magic link** — однократная ссылка на email (PKCE flow через `/auth/callback`)
- После логина — редирект по роли: admin → `/admin`, partner → `/partner`, user (гость) → `/me`

### `/me` — Личный кабинет гостя
Доступен гостю после magic-link логина (связка `auth.users` ↔ `public.users` по email).
- Карточка профиля: WBS score, name, WhatsApp, country, cohort — name/WhatsApp/country редактируемы (с audit-логом)
- Список бронирований: программа, даты, pax, status, pre/post WBS
- Для бронирований в статусе `active` без `pre_wbs` — кнопка «Take pre-stay WBS»
- Для бронирований в статусе `completed` без `post_wbs` — кнопка «Take post-stay WBS»
- Заполнение score (0–100) идёт через `/api/me/wbs`, доступ к чужим бронированиям заблокирован на API-уровне

---

## 2. Админ-панель (`/admin`)

Доступна юзерам с `role='admin'` в `public.profiles`. Защищена через middleware `src/proxy.ts` + route handler check.

### Overview (`/admin`)
KPI-карточки: счётчики properties / programs / guests / bookings. Live-список API endpoints для интеграций.

### Properties (`/admin/properties`)
Таблица всех объектов с возможностями:
- **Add** — модалка с полями: name, slug, parent (для sub-property — например, клиника внутри ретрита), island, country, cohort_tags (мульти), certified, active, contact_wa, description
- **Edit** в строке — та же форма с заполненными значениями
- **Soft delete** через переключатель Active → off (история бронирований сохраняется)

### Programs (`/admin/programs`)
Таблица программ:
- **Add** — модалка: name, cohort 1–4, tier (RESET/REBUILD/TRANSFORM), duration_days, price_usd, outcomes (теги), max_guests, is_composite, active, linked properties (мульти-выбор)
- **Edit** — то же. При редактировании linked-properties делает **replace** в `program_properties` (старые связи удаляются, новые вставляются)
- Soft delete (active → off)

### Guests (`/admin/users`)
Таблица всех гостей (intake leads из WBS-форма / Cura / direct entries):
- **Фильтры** — по программе и по property (через ассоциированные бронирования)
- Колонки: Guest (name + email), Country, Program(s), Property(ies), Baseline WBS, Latest stay (pre→post с дельтой), Cohort, Source
- **Клик по строке** → модалка с двумя вкладками:
  - **Details** — редактирование name, email, WhatsApp, country, WBS score, cohort, source
  - **Revisions** — история всех правок (changed fields, before→after, edited_by, timestamp)
- Каждая правка пишет append-only запись в `user_revisions` (диff + полный snapshot row до изменения) — **изменения не уничтожают данные**

### Team (`/admin/team`)
Управление членами команды (admin + partner + user):
- **Invite team member** — модалка: email + full_name + role + (для partner) Linked property
  - Генерирует криптостойкий 16-символьный пароль локально через `crypto.randomBytes`
  - Создаёт auth-юзера через `auth.admin.createUser` + проставляет role в `profiles`
  - Показывает пароль один раз с кнопкой Copy
- **Edit** — изменить роль/property/full_name. Защиты: нельзя демоутить последнего админа, нельзя менять свою роль
- **Reset pw** — генерит новый пароль, показывает один раз, старый сразу мёртв. Логирует в `partner_password_resets`
- Бейдж «admin pw» если пароль был задан админом (флаг `password_set_by_admin`)

### Bookings (`/admin/bookings`)
Таблица всех бронирований + полный CRUD + lifecycle UI:
- **Add** — модалка: guest (с автокомплитом или быстрым созданием нового), program, dates, pax, amount_usd, deposit_usd, status, pre/post WBS
- **Edit (клик по строке)** — та же форма + **Lifecycle section** с антд Steps + 4 action-кнопками:
  - **Confirm** (inquiry → confirmed) — email гостю + admin
  - **Start stay** (confirmed → active) — требует pre_wbs (prompt-modal если нет)
  - **Complete** (active → completed) — требует post_wbs (prompt-modal если нет)
  - **Cancel** (любой не-terminal → cancelled) — confirm-modal + email admin'у
- Backward переходы запрещены на API уровне. Admin escape hatch — прямой PATCH через старый Status select
- Trigger `set_booking_timestamps` автоматически стампит `confirmed_at` / `started_at` / `completed_at` / `cancelled_at`

---

## 3. Партнёрская панель (`/partner`)

Доступна юзерам с `role='partner'` + `partner_property_id` в `profiles`. RLS отрезает чужие данные на уровне базы.

### Programs (`/partner`)
Overview-таблица **только тех программ**, которые связаны с property партнёра, с агрегированной статистикой:
- Завершённые бронирования
- Средняя WBS-дельта (post - pre)
- Sample size
- 3 KPI-карточки сверху: программ всего, completed bookings, weighted avg WBS Δ

Данные идут через SQL view `partner_program_outcomes` (`security_invoker=off` + inline scope по `current_user_property()`).

### Guests (`/partner/guests`)
Гости с бронированиями на property партнёра. Та же UI что `/admin/users`, но:
- Фильтры по программе и property работают
- Edit modal: можно менять **только name, whatsapp, country**. wbs_score / email / cohort / source — read-only (API возвращает 403 если попытаться)
- Revisions tab — партнёр видит историю своих правок этого гостя (RLS политика `user_revisions_partner_read`)

### Specialists (`/partner/specialists`)
Две таблицы на одной странице:

**Roster** — управление специалистами:
- **Add** — модалка: name, role/specialty, cohort_focus (мульти), active
- **Edit** — та же форма
- **Card** → ссылка на `/partner/specialists/[id]`
- Property специалиста форсится в собственный `current_user_property()` — нельзя создать чужого

**Contribution** — анонимизированные агрегаты outcome-метрик (wbs_delta, sleep_quality, energy_index, stress_score). Без идентификаторов гостей — структурная приватность.

### Карточка специалиста (`/partner/specialists/[id]`)
- Профиль: name, role, cohort_focus, active/inactive, property
- 3 KPI: уникальных гостей с которыми работал, завершённых стэев, средняя WBS-дельта
- Таблица гостей: name, country, daties of stay, status, роль специалиста на этой брони (primary/assistant), pre→post WBS
- Источник — SQL view `specialist_guests` через junction `booking_specialists`

---

## 4. WBS опрос (`/start`)

**Wellness Baseline Score** — 23-вопросный опросник для baseline-оценки.

### Структура (7 секций)

| Секция | Вопросы | Sub-score |
|---|---|---|
| Movement & Physical Load | Q1 шаги, Q2 кардио, Q3 силовые | **Movement** |
| Sleep & Recovery | Q4 длительность, Q5 качество | **Recovery** |
| Lifestyle Risk | Q6 курение, Q7 алкоголь, Q8 переработанное мясо | **Lifestyle Risk** |
| Safety & Risk Behavior | Q9 ремни, Q10 телефон за рулём, Q11 мотоцикл | **Lifestyle Risk** |
| Social & Emotional | Q12 качественное время, Q13 отношения, Q14 удовлетворённость | **Emotional** |
| Stress & Life Satisfaction | Q15 стресс, Q16 удовлетворённость жизнью | **Emotional** |
| Body & Medical Context | Q17 пол, Q18 возраст, Q19 вес, Q20 мышечная масса, Q21 endurance, Q22 CVD, Q23 cancer | **контекст, не идёт в score** |

### Скоринг

Каждый вариант ответа имеет балл 0–1. Sub-score = средний балл по секции × 100. Total WBS = среднее 4 sub-score, округлённое.

Q17–Q23 — контекстные, не идут в score. Q22 (CVD) и Q23 (cancer) = Yes выставляют **flag**, показывается warning баннер на `/matched/[id]` и в email админу.

Полная разбивка скоринга — `src/lib/wbs.ts`. Веса легко правятся центрально.

### Mapping в cohort и рекомендацию

| WBS Total | Cohort | Recommendation |
|---|---|---|
| ≥ 70 | 1 | **Reset & Recovery** |
| ≥ 50 | 2 | **Performance & Energy** |
| < 50 | 3 | **Longevity & Balance** |

### Контактная секция (после опроса)

- Name (опц.)
- WhatsApp (**обязательно** — это идентификатор гостя)
- Email (опц.)
- Country (опц.)

### Что происходит после submit

1. Клиент локально считает score через `computeWbs(answers)`
2. POST на `/api/intake` с payload: контакт + wbs_score + cohort + sub_scores + recommendation + flags
3. Сервер создаёт строку в `public.users`, подбирает 3 matched-программы по cohort, посылает email админам
4. Редирект на `/matched/{user_id}` с результатами

---

## 5. Безопасность и приватность

- **Партнёрский scope** — RLS на 10+ политиках, плюс API double-check. Партнёр не может прочитать или изменить чужие данные даже через прямой SQL-запрос
- **Audit log** (`user_revisions`) — все правки на `public.users` логируются с before-snapshot. Изменения не разрушают данные
- **Cura webhook** — `INTAKE_WEBHOOK_SECRET` обязателен для `source='cura'`. Constant-time compare (timingSafeEqual)
- **Пароли** — bcrypt в Supabase Auth, plaintext не хранится. Admin может только **сбросить** (выдать новый), не «посмотреть»
- **Анонимные booking inquiries** — статус `inquiry` форсится на сервере, клиент не может прокинуть другой
- **Magic-link** — PKCE flow, токены через `signInWithOtp` + `/auth/callback` exchange
- **Аналитика партнёра** — `specialist_outcomes` агрегаты по дизайну не содержат `user_id` (structural privacy)

---

## 6. Что готово к работе сейчас

Платформа функционально полна для:
- Принимать публичные WBS-заявки
- Принимать публичные booking inquiries
- Принимать webhook-заявки от Cura
- Управлять всем: properties, programs, guests, bookings, team, specialists через admin-панель
- Партнёрское самообслуживание: мониторинг гостей и метрик, управление специалистами
- Гостевой self-service: профиль + бронирования + pre/post WBS

**Что не настроено, но включается одним env-var обновлением + Supabase Dashboard config:**
- **Email-нотификации (Resend)** — `RESEND_API_KEY` + `EMAIL_FROM` + `EMAIL_REPLY_TO` + `EMAIL_ADMIN_INBOX` в `.env.local`. После добавления — все нотификации (intake / booking inquiry / status transitions / magic-link) работают
- **Magic-link delivery** — Supabase Auth → SMTP Settings → Use Custom SMTP → ввести Resend SMTP creds (без этого встроенный sender Supabase ограничен 3 emails/час)

См. `reference_email_resend.md` в memory для пошаговой инструкции.

---

## 7. Что дальше — план Tier 4 (не реализовано)

Кандидаты на следующий цикл, упорядочены по value / cost:

### 7.1 — Платёжная интеграция (3–5 дней)
Когда inquiry апрувнули → отправить гостю чекаут на `deposit_usd`, потом на остаток. Провайдер: Stripe (USD/EU friendly), Paddle (proxy of record для taxes), или 2C2P (SEA-friendly). Webhook → обновляет `bookings.amount_usd` / `deposit_usd` / `status`.

**Решение**: какой провайдер брать — зависит от первичной географии гостей. Если основной трафик из Сингапура/HK — Stripe. Если из России — Tinkoff Pay через 2C2P.

### 7.2 — Telegram нотификации параллельно email (3 часа)
Email на 3.1 уже есть. Telegram бот даст моментальную доставку для admin/partner — особенно полезно если SMTP fail или гость пишет в нерабочее время.

Создать `@dit_admin_bot`, env `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ADMIN_CHAT_ID` + `TELEGRAM_PARTNER_CHATS` (json map property_id → chat_id). Fire-and-forget POST к Bot API из тех же мест, что email.

### 7.3 — `specialist_outcomes` entry UI (1 день)
Сейчас `specialist_outcomes` заполняется только через SQL. Партнёр или admin должен иметь UI:
- На `/admin/bookings` карточке (или на partner-side) — после `completed` появляется блок «Record outcomes»
- Multi-form: для каждого linked-специалиста → outcome_metric (dropdown) + delta_avg + sample_count
- Запись в `specialist_outcomes`, видна в Contribution table partner-вью

### 7.4 — Partner status transitions (полдня)
Сейчас lifecycle transitions (confirm/start/complete/cancel) — admin-only. Партнёр должен иметь право двигать брони на своих property:
- Расширить `/api/bookings/[id]/transition` permission check
- Добавить тот же Steps + buttons UI на `/partner/bookings` (новый раздел)
- RLS на `bookings` уже допустит SELECT для partner через junction; нужен новый UPDATE policy

### 7.5 — Force-rotate password при первом логине (2 часа)
Флаг `profiles.password_set_by_admin` уже есть, но не enforce'ится. Middleware: если флаг true и path не `/me/password` → redirect туда. На `/me/password` — форма смены, сбрасывает флаг.

### 7.6 — Public catalog SEO + i18n (несколько дней)
Static generation для `/programs/[slug]` — SEO landings под каждую программу. RU/EN/TH локализация. OG image generation.

### 7.7 — WBS form UX polish (полдня)
Сейчас 23 вопроса на одной странице. Опыт можно улучшить:
- Wizard (одна секция = один шаг с прогресс-баром сверху)
- Save & resume (сохранение черновика в localStorage)
- Numeric-input для веса с unit toggle (kg/lb)

### 7.8 — Booking notes / messaging (1–2 дня)
Currently inquiry → confirmed flow требует out-of-band coordination (WhatsApp). Внутренний thread:
- На карточке booking — список комментариев (admin + partner + guest могут писать)
- Notification на новый комментарий через email/Telegram
- Хранится в `booking_notes (booking_id, author_id, text, created_at)` с RLS по party

### 7.9 — Backup и export (1 день)
Регулярный pg_dump в S3 / Yandex Object Storage. Plus CSV-export гостей / бронирований для админа в `/admin/users` и `/admin/bookings` — кнопка «Export».

### 7.10 — Аналитика для admin (1–2 дня)
Dashboard поверх Supabase metrics + own тренды: новые intake/неделю, conversion intake→booking, avg WBS delta по cohort, top-performing программ. Можно через `partner_program_outcomes` view + новый `admin_funnel` view.

### Не делаем в Tier 4 (out of scope)
- WhatsApp Business integration — внешняя интеграция через partner aggregator (Twilio / Meta), требует business verification, не для MVP-фазы
- Mobile app — web responsive уже работает, отдельный app откладываем

---

## Рекомендованный порядок Tier 4

1. **7.1 платежи** — открывает revenue, единственный блокер для запуска реального трафика
2. **7.2 Telegram** — критично для оперативной работы (моментальные уведомления)
3. **7.3 specialist_outcomes UI** — закрывает loop: партнёр видит свои метрики в `Contribution` только когда есть записи
4. **7.4 partner status transitions** — снимает зависимость от admin для рутинных переходов
5. **7.5 force-rotate** — security debt
6. **7.7 WBS wizard** — UX, после первых живых юзеров и фидбека

Остальное — по фидбеку реальных пользователей.

---

## Технические детали

- **Деплой**: `rsync src/ + supabase-migrations/ + package*.json → root@103.76.180.236:/opt/dit-platform` → `npm install` → `npx next build` → `pm2 restart dit --update-env`
- **DB миграции**: применяются через MCP `apply_migration` против Supabase project `xbzrtofanbrahasxbisf`; общая БД для local и prod
- **Logs**: `pm2 logs dit` на VPS, `/root/.pm2/logs/dit-{out,error}.log`
- **Reset of state**: `pm2 restart dit --update-env` обязательно после правки `.env.local`
