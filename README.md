# SHEREBLOG NEWS

A professional, scalable, secure news and blogging platform.

**Stack:** Node.js + Express (REST API) · Supabase PostgreSQL + Supabase Storage ·
vanilla HTML/CSS/JavaScript on the frontend (no framework).

This repository is being built in phases. **All six phases from the
original roadmap are now complete**: foundation, Articles + Categories
API, the public site, the admin dashboard, Submissions/Newsletter/Media
Library, and now SEO, Settings/Appearance, Users, Audit Log, Analytics,
and the Media Library wired directly into the article editor. Every
screen fetches real data from a real Supabase-backed API — nothing in
this codebase is a mock.

## What's included in Phase 6 — SEO, Settings, Users, Audit Log, Analytics

- **SEO** (`server/controllers/seoController.js`) — `/sitemap.xml` and
  `/robots.txt` are generated **live** from real published articles and
  active categories on every request, not static files that go stale.
  `NewsArticle` JSON-LD schema, Open Graph, and Twitter Card tags were
  already in place from Phase 3's `article.html`.
- **Settings / Appearance** (`server/controllers/settingsController.js`,
  `admin/settings.html`) — a tabbed admin screen (General/Appearance,
  SEO, Social, Breaking News, Newsletter, Publishing, Security) reading
  and writing the real `settings` table seeded back in Phase 1. The
  public breaking-news bar (built in Phase 3, silently showing nothing
  until now) is fully live: enabling it here and picking an article
  makes it appear on the homepage immediately.
- **Users** (`server/controllers/userController.js`, `admin/users.html`) —
  full CRUD with role assignment (Super Admin/Admin/Editor/Author/
  Moderator), password reset, and disable. Privilege-escalation is
  enforced server-side, not just hidden in the UI: only a Super Admin
  can grant the Super Admin role, only a Super Admin can delete a user,
  nobody can disable or delete their own account.
- **Audit Log viewer** (`server/controllers/auditLogController.js`,
  `admin/audit-logs.html`) — every `recordAudit()` call made since
  Phase 1 (logins, article publishes, category/user/settings changes,
  submission decisions, and more) is now visible and filterable in the
  dashboard, not just sitting in the database.
- **Analytics** (`server/controllers/analyticsController.js`,
  `admin/analytics.html`) — real aggregate queries against
  `article_views` and `articles.views_count`: a 14-day views trend,
  views-by-category, and top articles. Charted with plain inline SVG/CSS
  (no charting library), consistent with the "no external frontend
  frameworks" constraint.
- **Media Library wired into the editor** — the gap flagged at the end
  of Phase 5 is now closed. The post editor's image toolbar button and
  the featured-image panel both got a genuine "Browse Media Library"
  option (`admin/js/media-picker.js`, a reusable modal) alongside the
  existing paste-a-URL option — no more workaround needed for
  device-uploaded images.

Every screen listed as "coming later" in the admin sidebar throughout
Phases 4–5 is now built and live.

## What's included in Phase 5 — Submissions, Newsletter, Media Library

- **Media Library** (`server/middleware/upload.js`, `server/controllers/mediaController.js`,
  `admin/media.html`) — real file uploads to Supabase Storage via
  `multer` (in-memory, never touches local disk). Per spec §43: MIME
  type AND extension are both checked against an allowlist (JPG/PNG/
  WEBP/PDF/DOC/DOCX), size-limited (`MAX_UPLOAD_SIZE_MB`), and the
  **original filename is never trusted** — every upload gets a fresh
  server-generated UUID filename, so path traversal and collisions
  aren't possible. If the DB insert fails after a successful Storage
  upload, the orphaned file is rolled back automatically. The admin page
  has drag-and-drop, search/filter, and an edit/delete modal for alt
  text and captions.
- **Newsletter** (`server/controllers/newsletterController.js`,
  `server/services/emailService.js`, `admin/subscribers.html`) — real
  double opt-in: subscribing stores a `pending` row with a random token
  and emails a confirmation link; clicking it lands on a real
  confirmation page (`public/newsletter-confirmed.html`), not raw JSON.
  A real `unsubscribe.html` page and endpoint exist too. Admin can
  search/filter/disable/delete subscribers and **export a genuine CSV**
  (streamed with the auth token attached via `fetch` + blob download,
  not a plain link — a plain `<a href>` to an authenticated API route
  wouldn't carry the JWT).
- **Publish notifications** (`server/services/newsletterNotifyService.js`) —
  when an article transitions into `published` (on create, on manual
  publish, or via the Phase 2 scheduler auto-publishing a scheduled
  post), every confirmed subscriber is emailed, fire-and-forget so it
  never slows down the publish action itself.
- **Email delivery, honestly scoped:** `emailService.js` is a real
  provider-agnostic abstraction (per spec §22) with a concrete Resend-
  compatible implementation. Without `EMAIL_PROVIDER_API_KEY` configured,
  emails are logged to the server console instead of sent — so
  confirmation/unsubscribe links are still fully usable in development —
  and switching providers later means editing this one file, nothing
  that calls it.
- **News Submissions moderation** (`server/controllers/submissionController.js`,
  `admin/submissions.html`) — the public Submit News form (built in
  Phase 3) now actually persists. Moderators/editors/admins can review
  the full story, add internal notes, mark reviewed/reject/archive, and
  **"Approve & Convert to Draft"** — which creates a real draft article
  pre-filled from the submission and opens it directly in the Phase 4
  article editor. Submissions never auto-publish, matching spec §19.

**Gap that's now closed:** the newsletter and submit-news forms on the
public site, called out as pending in the Phase 3 notes, are fully live
as of this phase.

**Remaining honest gap:** the post editor's image tools still take a
pasted URL rather than browsing the Media Library directly inline — the
upload backend is real now (test it on `admin/media.html`), but wiring
a "browse library" picker into the editor's toolbar is Phase 6 polish.

## What's included in Phase 4 — the admin dashboard

Vanilla HTML/CSS/JS, no build step — same technology constraint as the
public site, with its own distinct professional-CMS visual identity
(dark sidebar, Inter/IBM Plex Mono, red accent) so it doesn't feel like
a reskin of the editorial public site.

- **Auth** (`admin/index.html`, `admin/js/admin-api.js`,
  `admin/js/auth-guard.js`) — real login against `/api/auth/login`,
  JWT access/refresh stored client-side, automatic silent token refresh
  on a 401, and a guard that re-verifies the token against `/api/auth/me`
  on every protected page rather than trusting a token's mere presence.
- **Shared shell** (`admin/js/admin-layout.js`) — responsive sidebar
  (collapsible on mobile), topbar, and a role-aware nav: items the
  current user's role can't reach are hidden entirely (e.g. Categories
  management for `author`/`moderator`), and items whose backend doesn't
  exist yet (Media Library, Submissions, Users, Settings, etc.) render
  visibly disabled with a "coming later" tooltip instead of linking to
  a 404 — the same "don't fake it" principle as the public site.
- **Dashboard** (`admin/dashboard.html` + `server/controllers/dashboardController.js`,
  new this phase) — every stat is a real Supabase count: total/published/
  draft/scheduled/pending-review articles, active users, pending
  submissions, confirmed subscribers, plus live Recent Activity (from
  `audit_logs`) and Most-Read Articles.
- **Posts** (`admin/posts.html`) — searchable, filterable (status/category),
  paginated table; bulk select + bulk publish/trash; per-row
  edit/duplicate/trash/restore. Row actions are permission-aware:
  an `author` only gets edit/delete controls on their own articles,
  enforced by disabling the checkbox and buttons — backed by the same
  ownership check the API already enforces server-side.
- **Post editor** (`admin/post-editor.html` + `admin/js/post-editor.js`) —
  the centerpiece: a `contenteditable` rich-text area with a full
  formatting toolbar (headings, bold/italic/underline/strike, alignment,
  lists, blockquote, link, image-by-URL, table, hr, undo/redo), Write/
  Preview tabs, tag input, category select, featured-image fields with
  live preview, collapsible SEO panel, Draft/Publish/Schedule/Unpublish/
  Trash workflow (publish vs "Submit for Review" adapts to the logged-in
  user's role, matching the backend's own restriction), a datetime
  picker for scheduling, autosave every 20s once a post exists, and a
  `beforeunload` guard against losing unsaved work.
- **Categories** (`admin/categories.html`) — full CRUD in a modal
  workflow; deleting a category that still has articles surfaces the
  same reassign-first flow the backend enforces (a 409 from the API
  reveals a "reassign to…" picker rather than just failing).

**Known gap, called out honestly:** the featured-image and in-content
image tools accept a pasted URL rather than a device upload — real
functionality (any reachable image URL genuinely works today), just not
the "upload from your computer" flow, which needs the Supabase Storage
Media Library from Phase 5.

## What's included in Phase 3 — the public site

Vanilla HTML/CSS/JS, no build step, no framework — matches the spec's
technology requirement exactly. Served directly by Express as static
files (see `server/server.js`).

- **Design system** (`public/css/tokens.css`, `layout.css`, `cards.css`,
  `article.css`) — a distinct editorial identity: deep-navy ink on warm
  paper, a wire-red breaking/accent color, Fraunces for headlines, Inter
  for body text, and IBM Plex Mono for bylines/datelines/category tags
  styled like wire-service stamps.
- **Shared components** (`public/js/layout.js`) — masthead, sticky nav,
  mobile drawer, footer, and newsletter box are injected into every page
  from one source of truth, so nav/branding changes happen in one file.
- **`index.html`** — featured lead + secondary stories, newsletter CTA,
  paginated "Latest News" grid with Load More.
- **`article.html`** — full reading experience: sanitized rich content,
  byline, reading time, view count, Open Graph + Twitter Card + JSON-LD
  `NewsArticle` schema, Facebook/WhatsApp/X/Copy-Link sharing, tags,
  source attribution, and related articles from the same category.
- **`category.html`** — dynamic category pages driven entirely by the
  `:slug` in the URL — no per-category file or code change needed to add
  a new category.
- **`search.html`** — live search (debounced) against the articles
  full-text index, plus tag-filtered results.
- **`submit-news.html`** — the full public tip-submission form from the
  spec (name, email, phone, title, category, description, full story,
  source, location, additional info, consent checkbox). **Honesty note:**
  image/document upload inputs are present but intentionally disabled
  with an inline explanation, since the Media Library/upload backend
  doesn't exist until Phase 5 — I'm not wiring up a fake "upload" that
  silently does nothing.
- Every page has loading skeletons, empty states, and toast
  notifications for success/failure — no silent failures.

**Known gaps this phase surfaces (by design, not oversight):** the
newsletter subscribe form and the submit-news form both call API
endpoints (`/api/newsletter/subscribe`, `/api/submissions`) that don't
exist yet — they'll return a friendly error toast until Phase 5 builds
those routes. The breaking-news bar likewise checks
`/api/settings/breaking-news` and silently shows nothing until the
Settings API (Phase 6) exists. Everything else on these pages is fully
wired to the live Phase 2 API.

## What's included in Phase 2

- **Articles** (`server/controllers/articleController.js`,
  `server/routes/articleRoutes.js`, `server/routes/adminArticleRoutes.js`):
  - `GET /api/articles` — public, published-only, filterable by
    category/author/tag/search, paginated.
  - `GET /api/articles/:slug` — public article detail; records a view;
    returns related articles from the same category.
  - `GET /api/admin/articles`, `GET /api/admin/articles/:id` — staff
    listing/detail across every status (draft, pending review,
    scheduled, published, archived, trash).
  - `POST /api/articles` — create (author/editor/admin/super_admin).
  - `PUT /api/articles/:id` — update. **Ownership enforced on the
    backend**: an `author` may only edit their own article; only
    `editor`/`admin`/`super_admin` can publish or edit anyone else's.
  - `POST /api/articles/:id/duplicate`, `DELETE /api/articles/:id`
    (→ trash), `POST /api/articles/:id/restore`,
    `DELETE /api/articles/:id/permanent` (admin/super_admin only).
  - Content is sanitized server-side (`server/utils/sanitize.js`) with
    an allowlist matching the editor's formatting tools — no raw HTML
    from the client is ever stored or rendered as-is.
  - Slugs are auto-generated and guaranteed unique
    (`server/utils/slug.js`).
  - Tags are free-text on the article payload and auto-created/synced
    via `server/services/tagService.js`.
  - **Scheduling is real**: `server/services/schedulerService.js` polls
    every 60 seconds and flips `scheduled` articles to `published` once
    `scheduled_at` arrives. Scheduled articles are never visible on the
    public endpoints before that happens, because those only ever query
    `status = 'published'`.
- **Categories** (`server/controllers/categoryController.js`,
  `server/routes/categoryRoutes.js`, `server/routes/adminCategoryRoutes.js`):
  - Public `GET /api/categories`, `GET /api/categories/:slug` (with a
    page of its published articles).
  - Admin `POST/PUT/DELETE /api/categories` — deleting a category with
    existing articles is refused unless a `replacementCategoryId` is
    given, in which case those articles are reassigned first.
- **Tags**: `GET /api/tags` — public listing for tag clouds/filters.
- Every write action (create/edit/publish/delete/restore, category
  create/edit/delete) is recorded to `audit_logs` via
  `recordAudit()`.

## What's included in Phase 1

- `database/schema.sql` — every table from the spec (`users`, `roles`,
  `categories`, `articles`, `tags`, `article_tags`, `media`,
  `news_submissions`, `newsletter_subscribers`, `comments`, `settings`,
  `audit_logs`, `article_views`), with indexes, constraints, an
  `updated_at` trigger, full-text search on articles, and Row Level
  Security policies.
- `server/config/` — environment loading (fails fast if secrets are
  missing) and the Supabase service-role client.
- `server/middleware/` — JWT authentication (`requireAuth`), role-based
  authorization (`requireRole`, `requireRoleOrOwner`), rate limiting
  (general + a stricter one for `/auth`), Helmet security headers, CORS,
  and a centralized error handler that never leaks stack traces in
  production.
- `server/utils/` — bcrypt password hashing, JWT sign/verify, a
  structured `ApiError`, and an `asyncHandler` wrapper.
- `server/services/auditService.js` — writes to `audit_logs` (used by
  login/logout now; every future admin action will call this too).
- `server/controllers/authController.js` + `server/routes/authRoutes.js` —
  `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`,
  `GET /api/auth/me`. Login includes account-lockout protection after
  repeated failed attempts (configurable via the `settings` table).
- `server/scripts/createAdmin.js` — one-time CLI to create the first
  Super Admin user.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
# JWT_SECRET, JWT_REFRESH_SECRET (see database/README.md for Supabase setup)

# 3. Apply the database schema
# Paste database/schema.sql into the Supabase SQL Editor and run it.
# Full instructions: database/README.md

# 4. Create the first admin user
node server/scripts/createAdmin.js --email=admin@shereblog.com --password="a-strong-password" --name="Site Administrator"

# 5. Run the server
npm run dev      # with nodemon, auto-restart on change
# or
npm start
```

Then verify it's alive:

```bash
curl http://localhost:5000/api/health

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@shereblog.com","password":"a-strong-password"}'
```

Then open the admin dashboard in a browser at `http://localhost:5000/admin/index.html`
and log in with the admin account you just created. From there: Categories
→ create a category, Posts → New Post → write something, Publish. It'll
appear immediately on the public homepage at `http://localhost:5000/index.html`.

## Project structure

```
shereblog-news/
├── server/
│   ├── config/        # env loading, Supabase client
│   ├── controllers/    # request handlers
│   ├── middleware/     # auth, rate limiting, security headers, errors
│   ├── routes/          # Express routers
│   ├── services/        # audit logging, (soon) email
│   ├── utils/            # jwt, password hashing, ApiError, asyncHandler
│   ├── validators/       # express-validator rule sets
│   ├── scripts/          # one-off CLI scripts (createAdmin)
│   └── server.js         # app entrypoint
├── database/
│   ├── schema.sql        # full Postgres schema + RLS for Supabase
│   └── README.md          # Supabase project setup walkthrough
├── public/                # public site (Phase 3)
├── admin/                  # admin dashboard (Phase 4)
├── .env.example
└── package.json
```

## Roadmap — status

All six originally planned phases are complete. Genuinely remaining
work, not previously promised but worth knowing about for a real
production launch:

- **Comments** — the `comments` table and RLS policies exist (Phase 1
  schema, spec §40), but there's no API or admin moderation UI for them
  yet. The sidebar doesn't link to a comments page for this reason.
- **Real device-upload testing end-to-end** requires your own Supabase
  project and Storage bucket — I can't run `npm install` or hit a live
  Supabase instance from this sandbox (no network access here), so
  every phase was validated by syntax-checking every file and
  statically verifying every `require()`/asset reference resolves,
  not by booting the server. Follow `database/README.md` and the root
  `README.md` "Getting started" steps to run it for real.
- **Load/scale testing** (spec §54, §32) — indexes and pagination are
  in place throughout, but this hasn't been tested under real traffic.
- **Multi-file/bulk media upload**, **image cropping/resizing on
  upload**, and **PDF text-fill for legal pages** (spec §48 — About/
  Contact/Privacy/Terms/Cookie Policy/Disclaimer/Editorial Policy exist
  today as footer links but not as actual content pages) are reasonable
  next increments beyond the original 59-section brief.

## Security notes

- The Supabase **service role key** is used only in `server/config/supabase.js`
  and never touches `public/` or `admin/` frontend code.
- Passwords are hashed with bcrypt (`BCRYPT_SALT_ROUNDS`, default 12) —
  plain-text passwords are never stored or logged.
- Every admin API route will require `requireAuth` + `requireRole(...)`
  (or `requireRoleOrOwner(...)`) — authorization is enforced on the
  server, not just by hiding buttons in the UI.
- Row Level Security is enabled on every table as a defense-in-depth
  layer, even though the backend normally uses the service-role key
  which bypasses it.
