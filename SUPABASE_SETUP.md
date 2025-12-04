# Supabase Setup Guide for myCORE

To enable the backend for your application, run the following SQL queries in your Supabase Dashboard under **SQL Editor**.

## 1. Profiles Table (Users)
Stores user preferences and settings.

```sql
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
```

## 2. Habits Table
Stores the habit definitions.

```sql
create table habits (
  id text primary key,
  user_id uuid references auth.users not null,
  name text,
  icon text,
  interest text,
  schedule text,
  "triggerType" text,
  "triggerConfig" jsonb,
  streak integer default 0
);

alter table habits enable row level security;
create policy "Users can CRUD own habits" on habits for all using (auth.uid() = user_id);
```

## 3. Habit Instances Table
Stores daily completion logs.

```sql
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
```

## 4. Tasks Table
Stores todo items.

```sql
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
  reminder jsonb
);

alter table tasks enable row level security;
create policy "Users can CRUD own tasks" on tasks for all using (auth.uid() = user_id);
```

## 5. Projects Table
Stores project groupings.

```sql
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
```

---

## IMPORTANT: Environment Variables
Ensure you have created a `.env` file in your project root with the following keys from your Supabase Project Settings:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5c...
```
