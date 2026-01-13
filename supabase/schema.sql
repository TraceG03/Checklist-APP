-- Enable RLS
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;

-- TASKS TABLE
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  title text not null,
  notes text,
  due_date date not null default current_date,
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