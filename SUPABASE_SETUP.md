# Supabase Setup Guide for myCORE

To enable the backend for your application, run the following SQL query in your Supabase Dashboard under **SQL Editor**.

## Complete Database Setup
Run this single SQL query to set up all tables, policies, indexes, and triggers:

```sql
-- 1. Profiles Table (Users)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  name text,
  onboarded boolean default false,
  interests jsonb default '[]'::jsonb,
  settings jsonb default '{"locationEnabled": false, "notificationsEnabled": false, "screenTimeEnabled": false}'::jsonb
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- 2. Habits Table
create table habits (
  id text primary key,
  user_id uuid references auth.users not null,
  name text,
  icon text,
  interest text,
  schedule text,
  "triggerType" text,
  "triggerConfig" jsonb,
  goal jsonb,
  streak integer default 0,
  is_favorite boolean default false
);

alter table habits enable row level security;
create policy "Users can CRUD own habits" on habits for all using (auth.uid() = user_id);

-- 3. Habit Instances Table
create table habit_instances (
  id text primary key,
  habit_id text,
  user_id uuid references auth.users not null,
  date text,
  completed boolean default false,
  completed_at timestamp with time zone,
  value numeric
);

alter table habit_instances enable row level security;
create policy "Users can CRUD own instances" on habit_instances for all using (auth.uid() = user_id);

-- 4. Tasks Table
create table tasks (
  id text primary key,
  user_id uuid references auth.users not null,
  title text,
  description text,
  due_date text,
  due_time text,
  priority text,
  category text,
  project_id text,
  completed boolean default false,
  reminder jsonb,
  subtasks jsonb default '[]'::jsonb,
  attachments jsonb default '[]'::jsonb
);

alter table tasks enable row level security;
create policy "Users can CRUD own tasks" on tasks for all using (auth.uid() = user_id);

-- 5. Projects Table
create table projects (
  id text primary key,
  user_id uuid references auth.users not null,
  name text,
  description text,
  start_date text,
  end_date text,
  progress integer default 0,
  status text
);

alter table projects enable row level security;
create policy "Users can CRUD own projects" on projects for all using (auth.uid() = user_id);

-- 6. Performance Indexes
create index idx_habits_user_id on habits(user_id);
create index idx_habit_instances_user_id on habit_instances(user_id);
create index idx_habit_instances_date on habit_instances(date);
create index idx_habit_instances_habit_id on habit_instances(habit_id);
create index idx_tasks_user_id on tasks(user_id);
create index idx_tasks_project_id on tasks(project_id);
create index idx_projects_user_id on projects(user_id);

-- 7. Auto-Create Profile Trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

## IMPORTANT: Configuration Steps

### 1. Environment Variables
Ensure you have created a `.env` file in your project root with the following keys from your Supabase Project Settings:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5c...
```

### 2. Disable Email Confirmation (Required)
To allow users to sign up without email confirmation:

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers** → **Email**
3. **Disable** "Confirm email" toggle
4. Click **Save**

This ensures users can login immediately after signup without needing to verify their email.
