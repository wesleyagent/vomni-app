-- Migration 018: Add review_request_sent to bookings
-- Required by /api/cron/review-requests (hourly review request cron)

alter table bookings
  add column if not exists review_request_sent boolean default false;

create index if not exists idx_bookings_review_request
  on bookings(status, appointment_at, review_request_sent)
  where status = 'completed' and review_request_sent = false;
