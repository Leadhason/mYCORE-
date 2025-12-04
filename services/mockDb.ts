import { Habit, HabitInstance, InterestType, TriggerType, User, ScheduleType, Task, Project } from '../types';
import { formatDate } from '../utils';
import { supabase } from './supabase';

// --- SUPABASE DATABASE SERVICE ---
// Note: We keep the class name 'MockDBService' and export 'db' to maintain compatibility with existing imports.
// In a refactor, this should be renamed to 'DatabaseService'.

class MockDBService {
  private currentUserCache: User | null = null;

  constructor() {}

  // --- SUGGESTION ENGINE (Client-side logic remains helpful) ---
  getSuggestions(interests: InterestType[]): Habit[] {
    const SUGGESTED_HABITS: Habit[] = [
        { id: 'h1', name: 'Morning Run (Gym)', icon: 'Activity', interest: InterestType.HEALTH, schedule: ScheduleType.DAILY, triggerType: TriggerType.LOCATION, triggerConfig: { locationName: 'Gold\'s Gym' }, streak: 0 },
        { id: 'h2', name: 'Market Analysis', icon: 'TrendingUp', interest: InterestType.FINANCE, schedule: ScheduleType.WEEKDAYS, triggerType: TriggerType.APP_OPEN, triggerConfig: { appName: 'Market Terminal', actionDetail: 'Check S&P 500' }, streak: 0 },
        { id: 'h3', name: 'Social Media < 30m', icon: 'Smartphone', interest: InterestType.DETOX, schedule: ScheduleType.DAILY, triggerType: TriggerType.SCREEN_TIME, triggerConfig: { thresholdMinutes: 30 }, streak: 0 },
        { id: 'h4', name: 'Read 1 Chapter', icon: 'BookOpen', interest: InterestType.LEARNING, schedule: ScheduleType.DAILY, triggerType: TriggerType.MANUAL, streak: 0 },
        { id: 'h5', name: 'Deep Work Session', icon: 'Zap', interest: InterestType.PRODUCTIVITY, schedule: ScheduleType.WEEKDAYS, triggerType: TriggerType.APP_OPEN, triggerConfig: { appName: 'Timer Started' }, streak: 0 }
    ];

    let suggestions = SUGGESTED_HABITS.filter(h => interests.includes(h.interest));
    if (suggestions.length < 5) {
        const remaining = 5 - suggestions.length;
        const defaults = SUGGESTED_HABITS.filter(h => !suggestions.find(s => s.id === h.id)).slice(0, remaining);
        suggestions = [...suggestions, ...defaults];
    }
    return suggestions.slice(0, 5);
  }

  // --- USER ---

  async getUser(): Promise<User | null> {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error("Error fetching profile:", error);
        return null;
    }

    if (profile) {
        this.currentUserCache = profile as User;
        return profile as User;
    }
    return null;
  }

  async initUser(email: string, name: string): Promise<User> {
    if (!supabase) throw new Error("Supabase not configured");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    // Try to get existing
    const existing = await this.getUser();
    if (existing) return existing;

    // Create New Profile
    const newUser: User = {
      id: user.id,
      email,
      name,
      onboarded: false,
      interests: [],
      settings: { locationEnabled: false, notificationsEnabled: false, screenTimeEnabled: false }
    };

    const { error } = await supabase
        .from('profiles')
        .upsert(newUser);
        
    if (error) throw error;
    
    this.currentUserCache = newUser;
    return newUser;
  }

  async completeOnboarding(
    userId: string, 
    interests: InterestType[], 
    habits: Habit[], 
    permissions: { loc: boolean; notif: boolean; screen: boolean }
  ): Promise<void> {
    if (!supabase) return;

    // 1. Update User
    const updates = {
        onboarded: true,
        interests,
        settings: {
            locationEnabled: permissions.loc,
            notificationsEnabled: permissions.notif,
            screenTimeEnabled: permissions.screen
        }
    };

    const { error: userError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

    if (userError) throw userError;

    // 2. Save Habits
    // Ensure habits have the correct user_id (if we had a user_id column, but here we likely use RLS based on auth.uid())
    // For simplicity, we assume RLS handles ownership.
    const habitsToInsert = habits.map(h => ({
        ...h,
        user_id: userId,
        // Ensure ID is unique or let DB handle it. If ID comes from suggestion engine (e.g. 'h1'), 
        // we should generate a new UUID or unique string to avoid conflicts if multiple users use same ID.
        // However, for this MVP migration, let's prefix or rely on client generation.
        id: h.id.startsWith('h') ? `${userId}_${h.id}_${Date.now()}` : h.id
    }));

    const { error: habitError } = await supabase
        .from('habits')
        .insert(habitsToInsert);
    
    if (habitError) throw habitError;

    // 3. Seed Instances (Client logic triggers generation, but we save to DB)
    await this.seedInstancesForWeek(habitsToInsert);
  }

  async updateUserSettings(settings: User['settings']): Promise<void> {
    if (!supabase || !this.currentUserCache) return;
    
    const { error } = await supabase
        .from('profiles')
        .update({ settings })
        .eq('id', this.currentUserCache.id);
        
    if (error) throw error;
    this.currentUserCache = { ...this.currentUserCache, settings };
  }

  // --- HABITS ---

  async getHabits(): Promise<Habit[]> {
    if (!supabase) return [];
    
    const { data, error } = await supabase
        .from('habits')
        .select('*');
        
    if (error) {
        console.error("Error fetching habits", error);
        return [];
    }

    const habits = data as Habit[];
    
    // Calculate streaks dynamically
    const instances = await this.getAllInstances();
    
    for (const habit of habits) {
        const habitInstances = instances.filter(i => i.habitId === habit.id);
        this.calculateHabitStrength(habit, habitInstances);
    }
    
    return habits;
  }

  private calculateHabitStrength(habit: Habit, instances: HabitInstance[]): void {
    const sorted = [...instances].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let currentStreak = 0;
    const todayStr = formatDate(new Date());

    for (const inst of sorted) {
        if (inst.completed) {
            currentStreak++;
        } else {
             if (inst.date === todayStr) continue;
             break; 
        }
    }
    habit.streak = currentStreak;
  }

  // --- INSTANCES ---

  private async getAllInstances(): Promise<HabitInstance[]> {
    if (!supabase) return [];
    // Limit to recent history to avoid fetching everything forever?
    // For MVP, fetch all (or last 30 days)
    const { data, error } = await supabase
        .from('habit_instances')
        .select('*');
        
    return error ? [] : data as HabitInstance[];
  }

  async getWeekInstances(dates: string[]): Promise<HabitInstance[]> {
    if (!supabase) return [];

    // Fetch existing instances for these dates
    const { data: existing, error } = await supabase
        .from('habit_instances')
        .select('*')
        .in('date', dates);
        
    if (error) return [];
    
    const allInstances = existing as HabitInstance[];
    const habits = await this.getHabits();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let newInstances: any[] = [];

    // Check for missing instances and create them (Lazy Load)
    for (const date of dates) {
        const dayHabits = this.getHabitsForDay(date, habits);
        for (const habit of dayHabits) {
             const exists = allInstances.find(i => i.habitId === habit.id && i.date === date);
             if (!exists) {
                 newInstances.push({
                     id: `${date}_${habit.id}`,
                     habit_id: habit.id, // Maps to snake_case column if using simple auto-map, but let's stick to consistent naming
                     habitId: habit.id, // We'll keep JS prop for app compatibility, but send both or transform
                     user_id: user.id,
                     date: date,
                     completed: false
                 });
             }
        }
    }

    if (newInstances.length > 0) {
        // Transform for DB insert (snake_case if needed, but we'll assume JSON column or matching names)
        // Let's assume standard columns: id, habit_id, user_id, date, completed
        const dbInserts = newInstances.map(i => ({
            id: i.id,
            habit_id: i.habitId,
            user_id: i.user_id,
            date: i.date,
            completed: i.completed
        }));

        const { error: insertError } = await supabase
            .from('habit_instances')
            .upsert(dbInserts);
            
        if (!insertError) {
             // Return combined list
             // We need to map db 'habit_id' back to 'habitId' if fetching fresh
             return [...allInstances, ...newInstances.map(i => ({ ...i, habitId: i.habitId }))];
        }
    }

    return allInstances;
  }

  async updateInstanceStatus(instanceId: string, completed: boolean, value?: number): Promise<void> {
    if (!supabase) return;
    
    const updates: any = { 
        completed, 
        completed_at: completed ? new Date().toISOString() : null
    };
    if (value !== undefined) updates.value = value;

    await supabase
        .from('habit_instances')
        .update(updates)
        .eq('id', instanceId);
  }

  // --- TASKS & PROJECTS ---

  async getTasks(): Promise<Task[]> {
    if (!supabase) return [];
    const { data } = await supabase.from('tasks').select('*');
    return (data || []).map((t: any) => ({
        ...t,
        projectId: t.project_id, // Map DB snake_case to JS camelCase
        dueDate: t.due_date,
        dueTime: t.due_time
    }));
  }

  async addTask(task: Task): Promise<void> {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dbTask = {
        id: task.id,
        user_id: user.id,
        title: task.title,
        description: task.description,
        due_date: task.dueDate,
        due_time: task.dueTime,
        priority: task.priority,
        category: task.category,
        project_id: task.projectId,
        completed: task.completed,
        reminder: task.reminder
    };

    await supabase.from('tasks').insert(dbTask);
    if (task.projectId) await this.updateProjectProgress(task.projectId);
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    if (!supabase) return;
    
    const dbUpdates: any = { ...updates };
    if (updates.projectId) dbUpdates.project_id = updates.projectId;
    if (updates.dueDate) dbUpdates.due_date = updates.dueDate;
    if (updates.dueTime) dbUpdates.due_time = updates.dueTime;
    
    // Remove JS keys that don't match DB columns if necessary, or rely on Supabase ignoring extra fields if configured loose
    delete dbUpdates.projectId; 
    delete dbUpdates.dueDate;
    delete dbUpdates.dueTime;

    await supabase.from('tasks').update(dbUpdates).eq('id', taskId);
    
    // Check if we need to update project progress
    // We fetch the task to get project_id if not in updates
    if (updates.completed !== undefined) {
         const { data } = await supabase.from('tasks').select('project_id').eq('id', taskId).single();
         if (data?.project_id) await this.updateProjectProgress(data.project_id);
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    if (!supabase) return;
    const { data } = await supabase.from('tasks').select('project_id').eq('id', taskId).single();
    await supabase.from('tasks').delete().eq('id', taskId);
    if (data?.project_id) await this.updateProjectProgress(data.project_id);
  }

  async getProjects(): Promise<Project[]> {
    if (!supabase) return [];
    const { data } = await supabase.from('projects').select('*');
    return (data || []).map((p: any) => ({
        ...p,
        startDate: p.start_date,
        endDate: p.end_date
    }));
  }

  async addProject(project: Project): Promise<void> {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dbProject = {
        id: project.id,
        user_id: user.id,
        name: project.name,
        description: project.description,
        start_date: project.startDate,
        end_date: project.endDate,
        progress: project.progress,
        status: project.status
    };

    await supabase.from('projects').insert(dbProject);
  }

  private async updateProjectProgress(projectId: string): Promise<void> {
    if (!supabase) return;

    // Get all tasks for project
    const { data: tasks } = await supabase.from('tasks').select('completed').eq('project_id', projectId);
    
    if (!tasks) return;
    
    const total = tasks.length;
    const completed = tasks.filter((t: any) => t.completed).length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    const status = progress === 100 ? 'completed' : 'active';

    await supabase
        .from('projects')
        .update({ progress, status })
        .eq('id', projectId);
  }

  // --- HELPERS ---

  private getHabitsForDay(dateStr: string, habits: Habit[]): Habit[] {
     const date = new Date(dateStr);
     const dayOfWeek = date.getDay(); // 0 = Sun
     const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

     return habits.filter(h => {
        if (h.schedule === ScheduleType.DAILY) return true;
        if (h.schedule === ScheduleType.WEEKDAYS) return !isWeekend;
        if (h.schedule === ScheduleType.WEEKENDS) return isWeekend;
        return true;
     });
  }

  private async seedInstancesForWeek(habits: Habit[]) {
     if (!supabase) return;
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return;

     const today = new Date();
     const instancesToInsert: any[] = [];
     
     // Generate for last 7 days and next 3 days
     for (let i = -7; i <= 3; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const dateStr = formatDate(d);

        const dayHabits = this.getHabitsForDay(dateStr, habits);
        
        for (const h of dayHabits) {
            instancesToInsert.push({
                id: `${dateStr}_${h.id}`,
                habit_id: h.id,
                user_id: user.id,
                date: dateStr,
                completed: false
            });
        }
     }
     
     // Use Upsert to ignore duplicates
     if (instancesToInsert.length > 0) {
        await supabase.from('habit_instances').upsert(instancesToInsert);
     }
  }

  async reset() {
    // In real DB, we usually don't wipe data on logout.
    // Just clear local cache.
    this.currentUserCache = null;
  }
}

export const db = new MockDBService();