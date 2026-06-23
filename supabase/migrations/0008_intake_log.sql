-- Phase 4: observability log for the website/Amazon intake pipeline.
-- Rows are written by the intake API via the service-role client (bypasses RLS).
-- Founders read them in Settings → intake activity.
create table public.intake_events (
  id              uuid primary key default gen_random_uuid(),
  channel         order_channel not null,
  source_order_id text,
  status          text not null,            -- 'created' | 'duplicate' | 'error'
  message         text,
  order_no        text,                     -- the resulting order_no when created/duplicate
  payload         jsonb,
  created_at      timestamptz not null default now()
);
create index intake_events_created_idx on public.intake_events (created_at desc);

alter table public.intake_events enable row level security;

-- Authenticated founders may read intake events (debugging). Inserts go through the
-- service-role client in the API route, which bypasses RLS; no insert policy is granted
-- to authenticated/anon on purpose.
create policy intake_events_auth_read on public.intake_events
  for select to authenticated using (true);
