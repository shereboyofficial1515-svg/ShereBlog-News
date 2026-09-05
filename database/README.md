# Database Setup — SHEREBLOG NEWS

## 1. Create a Supabase project
1. Go to https://supabase.com/dashboard and create a new project.
2. Once provisioned, open **Project Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — server only)

## 2. Run the schema
1. Open **SQL Editor** in the Supabase dashboard.
2. Paste the full contents of `database/schema.sql` and run it.
3. Confirm the tables appear under **Table Editor**: `roles`, `users`, `categories`,
   `tags`, `articles`, `article_tags`, `media`, `news_submissions`,
   `newsletter_subscribers`, `comments`, `settings`, `audit_logs`, `article_views`.

## 3. Create the Storage bucket
1. Go to **Storage** in the dashboard.
2. Create a new bucket named `media` (matches `SUPABASE_MEDIA_BUCKET` in `.env`).
3. Set it to **public** if you want images served directly via public URL, or
   keep it private and have the backend generate signed URLs — the codebase
   supports either; public is simpler to start with.
4. Add a storage policy allowing the service role full access (it already
   bypasses RLS by default) and, if the bucket is public, a read-only policy
   for `anon`.

## 4. Create the first Super Admin
The schema seeds roles but not a user — you shouldn't put a real password
hash directly in a SQL file that might end up in version control. Instead,
once the server is running, use the one-time bootstrap script:

```bash
node server/scripts/createAdmin.js --email admin@shereblog.com --password "a-strong-password" --name "Site Administrator"
```

This hashes the password with bcrypt and inserts the user with the
`super_admin` role. Delete or restrict this script after first use in
production.

## 5. Environment variables
Copy `.env.example` to `.env` and fill in the Supabase values from step 1,
plus a strong random `JWT_SECRET` / `JWT_REFRESH_SECRET`
(e.g. `openssl rand -hex 64`).
