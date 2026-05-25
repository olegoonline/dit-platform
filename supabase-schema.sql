-- ============================================================
-- DIT Platform — full schema + seed
-- Paste this into Supabase SQL Editor and click Run.
-- Editor: https://supabase.com/dashboard/project/xbzrtofanbrahasxbisf/sql/new
-- ============================================================

create extension if not exists "uuid-ossp";

-- ─── PROPERTIES ──────────────────────────────────────────
create table if not exists properties (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text unique not null,
  parent_id     uuid references properties(id),
  island        text not null,
  country       text not null,
  cohort_tags   int[] not null default '{}',
  certified     boolean default false,
  active        boolean default true,
  contact_wa    text,
  description   text,
  created_at    timestamptz default now()
);

-- ─── SPECIALISTS ─────────────────────────────────────────
create table if not exists specialists (
  id            uuid primary key default uuid_generate_v4(),
  property_id   uuid references properties(id) on delete cascade,
  name          text not null,
  role          text,
  cohort_focus  int[] default '{}',
  active        boolean default true,
  created_at    timestamptz default now()
);

-- ─── PROGRAMS ────────────────────────────────────────────
create table if not exists programs (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  cohort          int not null check (cohort between 1 and 4),
  tier            text check (tier in ('RESET','REBUILD','TRANSFORM')),
  duration_days   int not null,
  price_usd       numeric(10,2) not null,
  max_guests      int default 10,
  outcomes        text[] default '{}',
  is_composite    boolean default false,
  active          boolean default true,
  created_at      timestamptz default now()
);

create table if not exists program_properties (
  program_id    uuid references programs(id) on delete cascade,
  property_id   uuid references properties(id) on delete cascade,
  role          text,
  primary key (program_id, property_id)
);

create table if not exists program_specialists (
  program_id    uuid references programs(id) on delete cascade,
  specialist_id uuid references specialists(id) on delete cascade,
  primary key (program_id, specialist_id)
);

-- ─── USERS / GUESTS ──────────────────────────────────────
create table if not exists users (
  id            uuid primary key default uuid_generate_v4(),
  name          text,
  email         text,
  whatsapp      text,
  country       text,
  wbs_score     int check (wbs_score between 0 and 100),
  cohort        int check (cohort between 1 and 4),
  source        text,
  raw_payload   jsonb,
  created_at    timestamptz default now()
);

-- ─── BOOKINGS ────────────────────────────────────────────
create table if not exists bookings (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references users(id),
  program_id    uuid references programs(id),
  arrival       date,
  departure     date,
  pax           int default 1,
  amount_usd    numeric(10,2),
  deposit_usd   numeric(10,2) default 0,
  status        text default 'inquiry'
                  check (status in ('inquiry','confirmed','active','completed','cancelled')),
  pre_wbs       int,
  post_wbs      int,
  created_at    timestamptz default now()
);

-- ─── SPECIALIST OUTCOMES ─────────────────────────────────
create table if not exists specialist_outcomes (
  id              uuid primary key default uuid_generate_v4(),
  specialist_id   uuid references specialists(id),
  program_id      uuid references programs(id),
  outcome_metric  text,
  delta_avg       numeric(5,2),
  sample_count    int default 1,
  recorded_at     timestamptz default now()
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────
alter table properties          enable row level security;
alter table specialists         enable row level security;
alter table programs            enable row level security;
alter table program_properties  enable row level security;
alter table program_specialists enable row level security;
alter table users               enable row level security;
alter table bookings            enable row level security;
alter table specialist_outcomes enable row level security;

drop policy if exists "public_read_properties" on properties;
drop policy if exists "public_read_programs" on programs;
drop policy if exists "public_read_prog_props" on program_properties;

create policy "public_read_properties" on properties for select using (true);
create policy "public_read_programs"   on programs   for select using (true);
create policy "public_read_prog_props" on program_properties for select using (true);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Tanya Core (parent)
insert into properties (name, slug, island, country, cohort_tags, certified, active, description)
values (
  'Tanya Samui — Core',
  'tanya-core',
  'Koh Samui', 'Thailand',
  '{1,2,3}', true, true,
  '15-year operating history. Royal Family endorsed. Primary accommodation, reception, and wellness coordination hub.'
)
on conflict (slug) do nothing;

-- Bunya Clinic (child of Tanya Core)
insert into properties (name, slug, parent_id, island, country, cohort_tags, certified, active, description)
select
  'Bunya Clinic',
  'bunya-clinic',
  id,
  'Koh Samui', 'Thailand',
  '{1}', true, true,
  'Medical detox and clinical wellness unit inside Tanya Samui. Doctor-supervised protocols, IV therapy, colonic, fasting programs.'
from properties where slug = 'tanya-core'
on conflict (slug) do nothing;

-- Wellbeing Center (child of Tanya Core)
insert into properties (name, slug, parent_id, island, country, cohort_tags, certified, active, description)
select
  'Tanya Wellbeing Center',
  'tanya-wellbeing',
  id,
  'Koh Samui', 'Thailand',
  '{2,3}', true, true,
  'Movement, mindfulness and spiritual practice unit. Yoga, breathwork, meditation, sound healing.'
from properties where slug = 'tanya-core'
on conflict (slug) do nothing;

-- Placeholder SEA properties
insert into properties (name, slug, island, country, cohort_tags, certified, active, description)
values
  ('Dragon Soul Koh Phangan', 'dragon-soul', 'Koh Phangan', 'Thailand', '{2,3}', false, true, 'Performance and mind-balance. Yoga, breathwork, movement. Pipeline — onboarding in progress.'),
  ('Holistic Hub Bintan',     'bintan-hub',  'Bintan',      'Indonesia', '{1,3}', false, true, 'Reset and recovery. Close to Singapore. Ideal for SG/HK outbound guests.')
on conflict (slug) do nothing;

-- Programs (single-object)
insert into programs (name, cohort, tier, duration_days, price_usd, outcomes, is_composite)
values
  ('5-Day Detox Entry',        1, 'RESET',     5, 850.00,  '{detox,sleep,stress}',          false),
  ('7-Day Medical Reset',      1, 'REBUILD',   7, 1190.00, '{detox,sleep,stress,energy}',   false),
  ('5-Day Performance Reset',  2, 'RESET',     5, 790.00,  '{fitness,energy,sleep}',        false),
  ('14-Day Performance Cycle', 2, 'TRANSFORM', 14, 2100.00, '{fitness,stress,energy}',      false),
  ('7-Day Mental Clarity',     3, 'REBUILD',   7, 980.00,  '{stress,sleep,mindfulness}',    false);

-- Composite program (Core Tanya + Bunya + Wellbeing)
insert into programs (name, cohort, tier, duration_days, price_usd, outcomes, is_composite)
values ('10-Day Full Reset — Tanya Signature', 1, 'TRANSFORM', 10, 1650.00,
        '{detox,sleep,stress,energy,mindfulness}', true);

-- Link composite program to all three Tanya objects
insert into program_properties (program_id, property_id, role)
select p.id, pr.id, pr.slug
from programs p, properties pr
where p.name = '10-Day Full Reset — Tanya Signature'
  and pr.slug in ('tanya-core','bunya-clinic','tanya-wellbeing')
on conflict do nothing;

-- Link single-object programs to Tanya Core
insert into program_properties (program_id, property_id, role)
select prog.id, prop.id, 'primary'
from programs prog, properties prop
where prog.is_composite = false
  and prop.slug = 'tanya-core'
on conflict do nothing;
