-- Enable RLS
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;

-- TASKS TABLE
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  title text not null,
  notes text,
  due_date date,
  completed boolean default false,
  source text not null default 'manual' check (source in ('manual', 'ai', 'voice')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table tasks enable row level security;

create policy "Users can view their own tasks"
  on tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own tasks"
  on tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tasks"
  on tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete their own tasks"
  on tasks for delete
  using (auth.uid() = user_id);

-- VOICE MEMOS TABLE
create table voice_memos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  created_at timestamptz default now(),
  audio_path text not null,
  transcript text,
  transcript_status text not null default 'pending' check (transcript_status in ('pending', 'done', 'error')),
  extract_status text not null default 'pending' check (extract_status in ('pending', 'done', 'error')),
  extracted_task_count int default 0,
  error text
);

alter table voice_memos enable row level security;

create policy "Users can view their own voice memos"
  on voice_memos for select
  using (auth.uid() = user_id);

create policy "Users can insert their own voice memos"
  on voice_memos for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own voice memos"
  on voice_memos for update
  using (auth.uid() = user_id);

create policy "Users can delete their own voice memos"
  on voice_memos for delete
  using (auth.uid() = user_id);

-- STORAGE BUCKET
-- Note: You'll need to create the 'voice-memos' bucket in the Supabase Dashboard manually if not using the CLI to provision.
-- RLS for Storage Objects (Storage schema is separate usually, but we can define policies on storage.objects)

-- Policy for reading files (users can read their own files)
create policy "Users can read their own voice memos"
  on storage.objects for select
  using ( bucket_id = 'voice-memos' and auth.uid()::text = (storage.foldername(name))[1] );

-- Policy for uploading files (users can upload to their own folder)
create policy "Users can upload their own voice memos"
  on storage.objects for insert
  with check ( bucket_id = 'voice-memos' and auth.uid()::text = (storage.foldername(name))[1] );

-- INSPECTIONS TABLE (Daily Inspections)
create table inspections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  title text not null,
  inspection_date date not null default current_date,
  status text not null default 'draft' check (status in ('draft', 'completed')),
  report_summary text,
  closeout_qna jsonb,
  closeout_generated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table inspections enable row level security;

create policy "Users can view their own inspections"
  on inspections for select using (auth.uid() = user_id);

create policy "Users can insert their own inspections"
  on inspections for insert with check (auth.uid() = user_id);

create policy "Users can update their own inspections"
  on inspections for update using (auth.uid() = user_id);

create policy "Users can delete their own inspections"
  on inspections for delete using (auth.uid() = user_id);

-- INSPECTION FINDINGS TABLE
create table inspection_findings (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid references inspections on delete cascade not null,
  user_id uuid references auth.users not null default auth.uid(),
  photo_path text,
  voice_memo_path text,
  transcript text,
  notes text,
  created_at timestamptz default now()
);

alter table inspection_findings enable row level security;

create policy "Users can view their own findings"
  on inspection_findings for select using (auth.uid() = user_id);

create policy "Users can insert their own findings"
  on inspection_findings for insert with check (auth.uid() = user_id);

create policy "Users can update their own findings"
  on inspection_findings for update using (auth.uid() = user_id);

create policy "Users can delete their own findings"
  on inspection_findings for delete using (auth.uid() = user_id);

-- STORAGE POLICIES FOR INSPECTION PHOTOS
create policy "Users can read their own inspection photos"
  on storage.objects for select
  using ( bucket_id = 'inspection-photos' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can upload their own inspection photos"
  on storage.objects for insert
  with check ( bucket_id = 'inspection-photos' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can delete their own inspection photos"
  on storage.objects for delete
  using ( bucket_id = 'inspection-photos' and auth.uid()::text = (storage.foldername(name))[1] );

-- PUSH NOTIFICATIONS
-- Store browser push subscriptions per user
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);

alter table push_subscriptions enable row level security;

create policy "Users can view their own push subscriptions"
  on push_subscriptions for select using (auth.uid() = user_id);

create policy "Users can insert their own push subscriptions"
  on push_subscriptions for insert with check (auth.uid() = user_id);

create policy "Users can delete their own push subscriptions"
  on push_subscriptions for delete using (auth.uid() = user_id);

-- Notification preferences per user
create table notification_settings (
  user_id uuid primary key references auth.users not null default auth.uid(),
  timezone text not null default 'UTC',
  send_hour int not null default 8 check (send_hour >= 0 and send_hour <= 23),
  send_minute int not null default 0 check (send_minute >= 0 and send_minute <= 59),
  enabled boolean not null default true,
  updated_at timestamptz default now()
);

alter table notification_settings enable row level security;

create policy "Users can view their own notification settings"
  on notification_settings for select using (auth.uid() = user_id);

create policy "Users can upsert their own notification settings"
  on notification_settings for insert with check (auth.uid() = user_id);

create policy "Users can update their own notification settings"
  on notification_settings for update using (auth.uid() = user_id);

-- Log of daily sends to prevent duplicate notifications
create table notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  local_date date not null,
  sent_at timestamptz default now(),
  unique (user_id, local_date)
);

alter table notification_logs enable row level security;

create policy "Users can view their own notification logs"
  on notification_logs for select using (auth.uid() = user_id);