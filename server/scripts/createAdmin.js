/**
 * One-time bootstrap script: creates the first Super Admin user.
 *
 * Usage:
 *   node server/scripts/createAdmin.js --email admin@shereblog.com --password "a-strong-password" --name "Site Administrator"
 *
 * Run this once after the database schema is applied. Restrict or remove
 * this script's access in production once the first admin exists — the
 * User Management screen in the admin dashboard should be used after that.
 */
require('dotenv').config();
const { supabaseAdmin } = require('../config/supabase');
const { hashPassword } = require('../utils/password');

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) {
      args[match[1]] = match[2];
    }
  });
  return args;
}

async function main() {
  const { email, password, name } = parseArgs();

  if (!email || !password || !name) {
    console.error('Usage: node server/scripts/createAdmin.js --email=... --password=... --name="..."');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('Password must be at least 10 characters.');
    process.exit(1);
  }

  const { data: role, error: roleError } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('name', 'super_admin')
    .single();

  if (roleError || !role) {
    console.error('Could not find the super_admin role. Did you run database/schema.sql?');
    process.exit(1);
  }

  const { data: existing } = await supabaseAdmin.from('users').select('id').eq('email', email).single();
  if (existing) {
    console.error(`A user with email ${email} already exists.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const { error: insertError } = await supabaseAdmin.from('users').insert({
    email,
    password_hash: passwordHash,
    full_name: name,
    role_id: role.id,
    status: 'active',
  });

  if (insertError) {
    console.error('Failed to create admin user:', insertError.message);
    process.exit(1);
  }

  console.log(`Super Admin created: ${email}`);
  process.exit(0);
}

main();
