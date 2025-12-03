import { supabase } from './supabaseClient';
import { Habit, HabitInstance, InterestType, TriggerType, User, ScheduleType, Task, Project } from '../types';
import { formatDate, getHabitStreak } from '../utils';

/* 
  REQUIRED SQL SETUP IN SUPABASE:

  create table profiles (
    id uuid references auth.users not null primary key,
    email text,
    name text,
    onboarded boolean default false,
    interests jsonb,
    settings jsonb
  );

  create table habits (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references profiles(id),
    name text,
    icon text,
    interest text,
    schedule text,
    trigger_type text,
    trigger_config jsonb,
    streak integer default 0
  );

  create table habit_instances (
    id text primary key, -- Composite key manually generated: YYYY-MM-DD_habitId
    user_id uuid references profiles(id),
    habit_id uuid references habits(id),
    date text,
    completed boolean default false,
    completed_at text,
    value numeric
  );

  create table tasks (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references profiles(id),
    title text,
    description text,
    due_date text,
    priority text,
    category text,
    project_id uuid, -- references projects(id)
    completed boolean default false,
    reminder jsonb
  );

  create table projects (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references profiles(id),
    name text,
    description text,
    start_date text,
    end_date text,
    progress integer default 0,
    status text
  );
*/

class SupabaseDBService {
  private currentUser: User | null = null;

  // --- USER PROFILE ---

  async getUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    if (this.currentUser) return this.currentUser;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !data) return null;

    this.currentUser = {
      id: data.id,
      email: data.email,
      name: data.name,
      onboarded: data.onboarded,
      interests: data.interests || [],
      settings: data.settings || { locationEnabled: false, notificationsEnabled: false, screenTimeEnabled: false }
    };

    return this.currentUser;
  }

  async initUser(email: string, name: string): Promise<User> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    // Check if profile exists
    const existing = await this.getUser();
    if (existing) return existing;

    const newUser: User = {
      id: user.id,
      email,
      name,
      onboarded: false,
      interests: [],
      settings: { locationEnabled: false, notificationsEnabled: false, screenTimeEnabled: false }
    };

    const { error } = await supabase.from('profiles').insert({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      onboarded: false,
      interests: [],
      settings: newUser.settings
    });

    if (error) throw error;
    this.currentUser = newUser;
    return newUser;
  }

  async completeOnboarding(
    userId: string, 
    interests: InterestType[], 
    habits: Habit[], 
    permissions: { loc: boolean; notif: boolean; screen: boolean }
  ): Promise<void> {
    
    // 1. Update Profile
    await supabase.from('profiles').update({
      interests,
      onboarded: true,
      settings: {
        locationEnabled: permissions.loc,
        notificationsEnabled: permissions.notif,
        screenTimeEnabled: permissions.screen
      }
    }).eq('id', userId);

    // 2. Insert Habits
    // Map frontend Habit model to DB columns (snake_case)
    const dbHabits = habits.map(h => ({
      user_id: userId,
      name: h.name,
      icon: h.icon,
      interest: h.interest,
      schedule: h.schedule,
      trigger_type: h.triggerType,
      trigger_config: h.triggerConfig || {},
      streak: 0
    }));

    if (dbHabits.length > 0) {
      await supabase.from('habits').insert(dbHabits);
    }
  }

  async updateUserSettings(settings: User['settings']): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('profiles').update({ settings }).eq('id', user.id);
    if (this.currentUser) this.currentUser.settings = settings;
  }

  // --- HABITS ---

  async getHabits(): Promise<Habit[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id);

    if (error) return [];

    const habits: Habit[] = data.map((row: any) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      interest: row.interest,
      schedule: row.schedule,
      triggerType: row.trigger_type,
      triggerConfig: row.trigger_config,
      streak: row.streak
    }));

    // Dynamic Streak Calculation
    // We could do this via SQL count, but sticking to existing util logic for now
    const { data: allInstances } = await supabase
      .from('habit_instances')
      .select('*')
      .eq('user_id', user.id);
    
    if (allInstances) {
      const mappedInstances: HabitInstance[] = allInstances.map((row: any) => ({
        id: row.id,
        habitId: row.habit_id,
        date: row.date,
        completed: row.completed,
        completedAt: row.completed_at,
        value: row.value
      }));

      habits.forEach(h => {
        const relevant = mappedInstances.filter(i => i.habitId === h.id);
        h.streak = getHabitStreak(relevant);
      });
    }

    return habits;
  }

  async getSuggestions(interests: InterestType[]): Promise<Habit[]> {
    return []; // Client-side logic mostly used in Onboarding
  }

  // --- INSTANCES ---

  async getWeekInstances(dates: string[]): Promise<HabitInstance[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // 1. Fetch existing instances for these dates
    const { data: existingRows } = await supabase
      .from('habit_instances')
      .select('*')
      .eq('user_id', user.id)
      .in('date', dates);
    
    let instances: HabitInstance[] = (existingRows || []).map((row: any) => ({
      id: row.id,
      habitId: row.habit_id,
      date: row.date,
      completed: row.completed,
      completedAt: row.completed_at,
      value: row.value
    }));

    // 2. Lazy Create Missing
    const habits = await this.getHabits();
    const missing: any[] = [];

    for (const date of dates) {
      const dayOfWeek = new Date(date).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const scheduledHabits = habits.filter(h => {
          if (h.schedule === ScheduleType.DAILY) return true;
          if (h.schedule === ScheduleType.WEEKDAYS) return !isWeekend;
          if (h.schedule === ScheduleType.WEEKENDS) return isWeekend;
          return true;
      });

      scheduledHabits.forEach(h => {
        // Construct composite ID
        const instanceId = `${date}_${h.id}`;
        if (!instances.find(i => i.id === instanceId)) {
           const newInst = {
             id: instanceId,
             user_id: user.id,
             habit_id: h.id,
             date: date,
             completed: false
           };
           missing.push(newInst);
           // Add to return array optimistically
           instances.push({
             id: instanceId,
             habitId: h.id,
             date,
             completed: false
           });
        }
      });
    }

    if (missing.length > 0) {
      await supabase.from('habit_instances').upsert(missing, { onConflict: 'id' });
    }

    return instances;
  }

  async updateInstanceStatus(instanceId: string, completed: boolean, value?: number): Promise<void> {
    const updateData: any = { completed };
    if (completed) updateData.completed_at = new Date().toISOString();
    if (value !== undefined) updateData.value = value;

    await supabase
      .from('habit_instances')
      .update(updateData)
      .eq('id', instanceId);
  }

  // --- TASKS ---

  async getTasks(): Promise<Task[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase.from('tasks').select('*').eq('user_id', user.id);
    
    return (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      dueDate: row.due_date,
      priority: row.priority,
      category: row.category,
      projectId: row.project_id,
      completed: row.completed,
      reminder: row.reminder
    }));
  }

  async addTask(task: Task): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dbTask = {
      user_id: user.id,
      title: task.title,
      description: task.description,
      due_date: task.dueDate,
      priority: task.priority,
      category: task.category,
      project_id: task.projectId || null,
      completed: task.completed,
      reminder: task.reminder
    };

    const { data, error } = await supabase.from('tasks').insert(dbTask).select();
    
    if (!error && task.projectId) {
      await this.updateProjectProgress(task.projectId);
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
    // ... map other fields as needed for specific updates

    await supabase.from('tasks').update(dbUpdates).eq('id', taskId);

    // Trigger project calc check
    if (updates.completed !== undefined) {
      // Need project ID. In production, pass it or query it.
      const { data } = await supabase.from('tasks').select('project_id').eq('id', taskId).single();
      if (data && data.project_id) {
        await this.updateProjectProgress(data.project_id);
      }
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    const { data } = await supabase.from('tasks').select('project_id').eq('id', taskId).single();
    await supabase.from('tasks').delete().eq('id', taskId);
    if (data && data.project_id) await this.updateProjectProgress(data.project_id);
  }

  // --- PROJECTS ---

  async getProjects(): Promise<Project[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase.from('projects').select('*').eq('user_id', user.id);
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      startDate: row.start_date,
      endDate: row.end_date,
      progress: row.progress,
      status: row.status
    }));
  }

  async addProject(project: Project): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('projects').insert({
      user_id: user.id,
      name: project.name,
      description: project.description,
      start_date: project.startDate,
      end_date: project.endDate,
      progress: 0,
      status: 'active'
    });
  }

  private async updateProjectProgress(projectId: string): Promise<void> {
    // Count total and completed tasks
    const { count: total } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    const { count: completed } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('completed', true);

    const safeTotal = total || 0;
    const safeCompleted = completed || 0;
    const progress = safeTotal === 0 ? 0 : Math.round((safeCompleted / safeTotal) * 100);
    const status = progress === 100 ? 'completed' : 'active';

    await supabase
      .from('projects')
      .update({ progress, status })
      .eq('id', projectId);
  }

  async reset() {
    await supabase.auth.signOut();
  }
}

export const db = new SupabaseDBService();