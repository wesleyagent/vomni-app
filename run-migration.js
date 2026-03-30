const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://obyewocpvopatuagqfkx.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieWV3b2Nwdm9wYXR1YWdxZmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ2MjEwNiwiZXhwIjoyMDkwMDM4MTA2fQ.fHN4xxduXuuSzPyxI9fCA4sQPY1LMXowIgOa5AlXVPI';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function runSQL(sql) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/exec_sql', {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  return { status: res.status, body: await res.text() };
}

async function main() {
  // Read the migration file
  const migrationSQL = fs.readFileSync('./supabase/migrations/005_booking_system.sql', 'utf8');

  // Split into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to run`);

  // Try running via rpc exec_sql first
  let rpcRes = await runSQL('SELECT 1 as test');
  console.log('exec_sql available:', rpcRes.status);

  if (rpcRes.status === 404) {
    console.log('exec_sql not available, trying individual table operations via Supabase client...');

    // We'll create tables by inserting test data and catching errors
    // Actually let's just use the Supabase Management API

    // First check if tables already exist by trying to query them
    const tables = ['services', 'staff', 'staff_services', 'business_hours', 'staff_hours', 'blocked_times'];

    for (const table of tables) {
      const { error } = await sb.from(table).select('id').limit(1);
      if (error) {
        console.log(`Table ${table}: MISSING (${error.message})`);
      } else {
        console.log(`Table ${table}: EXISTS`);
      }
    }

    // Check if booking columns exist on bookings
    const { data: testBooking, error: bkErr } = await sb.from('bookings').select('staff_id, service_name, booking_source, status, cancellation_token').limit(1);
    if (bkErr) {
      console.log('Booking columns: MISSING (' + bkErr.message + ')');
    } else {
      console.log('Booking columns: EXISTS');
    }

    // Check if business booking columns exist
    const { data: testBiz, error: bizErr } = await sb.from('businesses').select('booking_slug, booking_enabled, booking_buffer_minutes').limit(1);
    if (bizErr) {
      console.log('Business booking columns: MISSING (' + bizErr.message + ')');
    } else {
      console.log('Business booking columns: EXISTS');
    }

    console.log('\n⚠️  Cannot run CREATE TABLE via the Supabase REST API.');
    console.log('You need to run the migration SQL in the Supabase SQL Editor.');
    console.log('Go to: https://supabase.com/dashboard/project/obyewocpvopatuagqfkx/sql/new');
    console.log('Then paste the contents of: supabase/migrations/005_booking_system.sql');
  }
}

main().catch(console.error);
