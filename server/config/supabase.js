const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// This client uses the SERVICE ROLE key. It bypasses Row Level Security
// and must NEVER be sent to, imported by, or exposed in any frontend code
// (public/ or admin/). It only ever runs on the server.
const supabaseAdmin = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = { supabaseAdmin };
