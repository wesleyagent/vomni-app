const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://obyewocpvopatuagqfkx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieWV3b2Nwdm9wYXR1YWdxZmt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ2MjEwNiwiZXhwIjoyMDkwMDM4MTA2fQ.fHN4xxduXuuSzPyxI9fCA4sQPY1LMXowIgOa5AlXVPI'
);

async function main() {
  // Find a business
  const { data: businesses } = await sb.from('businesses').select('id, name, booking_slug, booking_enabled').limit(5);
  console.log('Existing businesses:', JSON.stringify(businesses, null, 2));

  if (!businesses || businesses.length === 0) {
    console.log('No businesses found!');
    return;
  }

  const biz = businesses[0];
  console.log('\nSetting up booking for:', biz.name, '(', biz.id, ')');

  // Enable booking with slug
  const slug = 'test-salon';
  const { error: updateErr } = await sb.from('businesses').update({
    booking_slug: slug,
    booking_enabled: true,
    booking_buffer_minutes: 0,
    booking_advance_days: 30,
    booking_cancellation_hours: 24,
    booking_currency: 'ILS',
    booking_timezone: 'Asia/Jerusalem',
    require_phone: true,
    require_email: false,
  }).eq('id', biz.id);

  if (updateErr) {
    console.log('Error updating business:', updateErr.message);
    return;
  }
  console.log('Booking enabled with slug:', slug);

  // Add business hours (Sun-Thu 9-18, Fri 9-14, Sat closed)
  await sb.from('business_hours').delete().eq('business_id', biz.id);
  const hours = [
    { business_id: biz.id, day_of_week: 0, is_open: true, open_time: '09:00', close_time: '18:00' },
    { business_id: biz.id, day_of_week: 1, is_open: true, open_time: '09:00', close_time: '18:00' },
    { business_id: biz.id, day_of_week: 2, is_open: true, open_time: '09:00', close_time: '18:00' },
    { business_id: biz.id, day_of_week: 3, is_open: true, open_time: '09:00', close_time: '18:00' },
    { business_id: biz.id, day_of_week: 4, is_open: true, open_time: '09:00', close_time: '18:00' },
    { business_id: biz.id, day_of_week: 5, is_open: true, open_time: '09:00', close_time: '14:00' },
    { business_id: biz.id, day_of_week: 6, is_open: false, open_time: '09:00', close_time: '18:00' },
  ];
  const { error: hoursErr } = await sb.from('business_hours').insert(hours);
  if (hoursErr) console.log('Hours error:', hoursErr.message);
  else console.log('Business hours set');

  // Add services
  const services = [
    { business_id: biz.id, name: 'Haircut', name_he: 'תספורת', duration_minutes: 30, price: 80, currency: 'ILS', is_active: true, display_order: 0 },
    { business_id: biz.id, name: 'Beard Trim', name_he: 'עיצוב זקן', duration_minutes: 20, price: 40, currency: 'ILS', is_active: true, display_order: 1 },
    { business_id: biz.id, name: 'Haircut + Beard', name_he: 'תספורת + זקן', duration_minutes: 45, price: 100, currency: 'ILS', is_active: true, display_order: 2 },
    { business_id: biz.id, name: 'Hair Coloring', name_he: 'צביעת שיער', duration_minutes: 90, price: 200, currency: 'ILS', is_active: true, display_order: 3 },
  ];
  const { data: insertedServices, error: svcErr } = await sb.from('services').insert(services).select('id, name');
  if (svcErr) console.log('Services error:', svcErr.message);
  else console.log('Services added:', insertedServices.map(s => s.name).join(', '));

  // Add 2 staff members
  const staffMembers = [
    { business_id: biz.id, name: 'David', name_he: 'דוד', role: 'staff', is_active: true, display_order: 0 },
    { business_id: biz.id, name: 'Yael', name_he: 'יעל', role: 'staff', is_active: true, display_order: 1 },
  ];
  const { data: insertedStaff, error: staffErr } = await sb.from('staff').insert(staffMembers).select('id, name');
  if (staffErr) console.log('Staff error:', staffErr.message);
  else console.log('Staff added:', insertedStaff.map(s => s.name).join(', '));

  // Assign all services to both staff
  if (insertedServices && insertedStaff) {
    const assignments = [];
    for (const staff of insertedStaff) {
      for (const svc of insertedServices) {
        assignments.push({ staff_id: staff.id, service_id: svc.id });
      }
    }
    const { error: assignErr } = await sb.from('staff_services').insert(assignments);
    if (assignErr) console.log('Assignment error:', assignErr.message);
    else console.log('All services assigned to all staff');
  }

  console.log('\n--- DONE ---');
  console.log('Booking page URL: http://localhost:3001/book/' + slug);
}

main().catch(console.error);
