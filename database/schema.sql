-- ====================================================================
-- SHEREBLOG NEWS — Database Schema (Supabase / PostgreSQL)
-- Run this in the Supabase SQL Editor on a fresh project.
-- Idempotent-ish: uses IF NOT EXISTS where practical. For a totally
-- clean re-run, drop the schema objects first.
-- ====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- --------------------------------------------------------------------
-- ROLES
-- --------------------------------------------------------------------
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null check (name in ('super_admin','admin','editor','author','moderator')),
  description text,
  created_at timestamptz not null default now()
);

insert into roles (name, description) values
  ('super_admin', 'Full, unrestricted access to every part of the platform.'),
  ('admin', 'Manages articles, categories, users, submissions, settings.'),
  ('editor', 'Creates, edits, reviews, and publishes any article.'),
  ('author', 'Creates and edits their own articles only.'),
  ('moderator', 'Manages news submissions and comment moderation.')
on conflict (name) do nothing;

-- --------------------------------------------------------------------
-- USERS  (platform staff: admins/editors/authors/moderators)
-- --------------------------------------------------------------------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  full_name text not null,
  avatar_url text,
  bio text,
  social_links jsonb default '{}'::jsonb,
  role_id uuid not null references roles(id) on delete restrict,
  status text not null default 'active' check (status in ('active','disabled')),
  failed_login_attempts int not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_email on users(email);
create index if not exists idx_users_role on users(role_id);

-- --------------------------------------------------------------------
-- CATEGORIES
-- --------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  image_url text,
  seo_title text,
  seo_description text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_categories_slug on categories(slug);
create index if not exists idx_categories_active on categories(is_active);

-- --------------------------------------------------------------------
-- TAGS
-- --------------------------------------------------------------------
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------------
-- ARTICLES
-- --------------------------------------------------------------------
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  slug text unique not null,
  content text not null default '',        -- sanitized HTML
  excerpt text,
  featured_image_url text,
  featured_image_caption text,
  featured_image_alt text,
  category_id uuid references categories(id) on delete set null,
  author_id uuid references users(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft','pending_review','scheduled','published','archived','trash')),
  seo_title text,
  seo_description text,
  seo_keywords text,
  canonical_url text,
  source text,
  is_featured boolean not null default false,
  is_breaking boolean not null default false,
  breaking_priority int default 0,
  views_count bigint not null default 0,
  scheduled_at timestamptz,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_articles_slug on articles(slug);
create index if not exists idx_articles_status on articles(status);
create index if not exists idx_articles_category on articles(category_id);
create index if not exists idx_articles_author on articles(author_id);
create index if not exists idx_articles_published_at on articles(published_at desc);
create index if not exists idx_articles_scheduled_at on articles(scheduled_at);
create index if not exists idx_articles_featured on articles(is_featured);
create index if not exists idx_articles_breaking on articles(is_breaking);
-- Full-text search across title/excerpt/content
alter table articles add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(content,'')), 'C')
  ) stored;
create index if not exists idx_articles_search on articles using gin(search_vector);

-- --------------------------------------------------------------------
-- ARTICLE_TAGS (many-to-many)
-- --------------------------------------------------------------------
create table if not exists article_tags (
  article_id uuid not null references articles(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (article_id, tag_id)
);

-- --------------------------------------------------------------------
-- MEDIA (metadata only — actual files live in Supabase Storage)
-- --------------------------------------------------------------------
create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,       -- original name, display only, never trusted for paths
  storage_path text not null,    -- path inside the Supabase bucket
  file_url text not null,        -- public or signed URL
  file_type text not null check (file_type in ('image','document','other')),
  mime_type text not null,
  file_size bigint not null,
  alt_text text,
  caption text,
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_media_type on media(file_type);
create index if not exists idx_media_uploaded_by on media(uploaded_by);

-- --------------------------------------------------------------------
-- NEWS_SUBMISSIONS (public tips / user-submitted stories)
-- --------------------------------------------------------------------
create table if not exists news_submissions (
  id uuid primary key default gen_random_uuid(),
  submitter_name text not null,
  email text not null,
  phone text,
  title text not null,
  category_id uuid references categories(id) on delete set null,
  description text,
  full_story text not null,
  source text,
  location text,
  image_url text,
  document_url text,
  consent_given boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending','reviewed','approved','rejected','archived')),
  internal_notes text,
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  converted_article_id uuid references articles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_submissions_status on news_submissions(status);
create index if not exists idx_submissions_created on news_submissions(created_at desc);

-- --------------------------------------------------------------------
-- NEWSLETTER_SUBSCRIBERS
-- --------------------------------------------------------------------
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','unsubscribed')),
  confirmation_token text,
  preferences jsonb default '{}'::jsonb,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create index if not exists idx_subscribers_email on newsletter_subscribers(email);
create index if not exists idx_subscribers_status on newsletter_subscribers(status);

-- --------------------------------------------------------------------
-- COMMENTS
-- --------------------------------------------------------------------
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  name text not null,
  email text not null,
  content text not null,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','spam')),
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_article on comments(article_id);
create index if not exists idx_comments_status on comments(status);

-- --------------------------------------------------------------------
-- SETTINGS (key/value site configuration)
-- --------------------------------------------------------------------
create table if not exists settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------
-- AUDIT_LOGS
-- --------------------------------------------------------------------
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_user on audit_logs(user_id);
create index if not exists idx_audit_logs_created on audit_logs(created_at desc);

-- --------------------------------------------------------------------
-- ARTICLE_VIEWS (lightweight view tracking for analytics)
-- --------------------------------------------------------------------
create table if not exists article_views (
  id bigserial primary key,
  article_id uuid not null references articles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  ip_hash text  -- hashed, never raw IP
);

create index if not exists idx_article_views_article on article_views(article_id);
create index if not exists idx_article_views_viewed_at on article_views(viewed_at desc);

-- ====================================================================
-- updated_at auto-touch trigger
-- ====================================================================
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at before update on users
  for each row execute function touch_updated_at();

drop trigger if exists trg_categories_updated_at on categories;
create trigger trg_categories_updated_at before update on categories
  for each row execute function touch_updated_at();

drop trigger if exists trg_articles_updated_at on articles;
create trigger trg_articles_updated_at before update on articles
  for each row execute function touch_updated_at();

-- ====================================================================
-- ROW LEVEL SECURITY
-- The Express backend talks to Supabase using the SERVICE ROLE key
-- (server-side only), which bypasses RLS by design. RLS here is a
-- defense-in-depth layer in case the anon/public key is ever used
-- directly (e.g. future direct-from-browser reads of published data).
-- ====================================================================

alter table users enable row level security;
alter table categories enable row level security;
alter table tags enable row level security;
alter table articles enable row level security;
alter table article_tags enable row level security;
alter table media enable row level security;
alter table news_submissions enable row level security;
alter table newsletter_subscribers enable row level security;
alter table comments enable row level security;
alter table settings enable row level security;
alter table audit_logs enable row level security;
alter table article_views enable row level security;

-- Public (anon) read of published articles only
drop policy if exists "public_read_published_articles" on articles;
create policy "public_read_published_articles" on articles
  for select using (status = 'published');

-- Public (anon) read of active categories
drop policy if exists "public_read_active_categories" on categories;
create policy "public_read_active_categories" on categories
  for select using (is_active = true);

-- Public (anon) read of tags
drop policy if exists "public_read_tags" on tags;
create policy "public_read_tags" on tags
  for select using (true);

-- Public (anon) read of approved comments
drop policy if exists "public_read_approved_comments" on comments;
create policy "public_read_approved_comments" on comments
  for select using (status = 'approved');

-- Public (anon) insert of a submission, comment, or newsletter signup
-- (writes still pass through backend validation before reaching here)
drop policy if exists "public_insert_submissions" on news_submissions;
create policy "public_insert_submissions" on news_submissions
  for insert with check (true);

drop policy if exists "public_insert_comments" on comments;
create policy "public_insert_comments" on comments
  for insert with check (true);

drop policy if exists "public_insert_subscribers" on newsletter_subscribers;
create policy "public_insert_subscribers" on newsletter_subscribers
  for insert with check (true);

-- No public policies are defined for users, media, audit_logs,
-- settings, article_views, or article_tags — those are reachable
-- only via the service-role key on the server.

-- ====================================================================
-- Seed: default settings
-- ====================================================================
insert into settings (key, value) values
  ('site', '{"name":"SHEREBLOG NEWS","description":"Independent digital news you can trust.","logo_url":"","favicon_url":"","contact_email":""}'),
  ('seo', '{"default_title":"SHEREBLOG NEWS","default_description":"Breaking news, politics, entertainment, sports, business and more.","keywords":"","google_verification":""}'),
  ('social', '{"facebook":"#","tiktok":"#","whatsapp":"#","twitter":"#","instagram":"#","youtube":"#"}'),
  ('breaking_news', '{"enabled":false,"article_id":null,"custom_text":"","priority":0}'),
  ('newsletter', '{"enabled":true,"sender_name":"SHEREBLOG NEWS","sender_email":""}'),
  ('publishing', '{"default_status":"draft","default_category_id":null}'),
  ('security', '{"login_attempt_limit":5,"lockout_minutes":15,"session_timeout_minutes":10080}')
on conflict (key) do nothing;

-- ====================================================================
-- Seed: first Super Admin
-- Replace the password_hash below by generating one with bcrypt
-- (see database/README.md) before running this in production.
-- ====================================================================
-- insert into users (email, password_hash, full_name, role_id, status)
-- select 'admin@shereblog.com', '<bcrypt-hash-here>', 'Site Administrator', id, 'active'
-- from roles where name = 'super_admin';
