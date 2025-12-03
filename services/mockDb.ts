import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Habit, HabitInstance, InterestType, TriggerType, User, ScheduleType, Task, Project } from '../types';
import { formatDate } from '../utils';

// --- DATABASE SCHEMA ---

interface MyCoreDB extends DBSchema {
  users: {
    key: string;
    value: User;
    indexes: { 'by-email': string };
  };
  habits: {
    key: string;
    value: Habit;
  };
  instances: {
    key: string;
    value: HabitInstance;
    indexes: { 'by-date': string; 'by-habit': string };
  };
  tasks: {
    key: string;
    value: Task;
  };
  projects: {
    key: string;
    value: Project;
  };
}

const DB_NAME = 'mycore-db';
const DB_VERSION = 1;

// --- SEED DATA ---

const SUGGESTED_HABITS: Habit[] = [
  {
    id: 'h1',
    name: 'Morning Run (Gym)',
    icon: 'Activity',
    interest: InterestType.HEALTH,
    schedule: ScheduleType.DAILY,
    triggerType: TriggerType.LOCATION,
    triggerConfig: { locationName: 'Gold\'s Gym' },
    streak: 0,
  },
  {
    id: 'h2',
    name: 'Market Analysis',
    icon: 'TrendingUp',
    interest: InterestType.FINANCE,
    schedule: ScheduleType.WEEKDAYS,
    triggerType: TriggerType.APP_OPEN,
    triggerConfig: { appName: 'Market Terminal', actionDetail: 'Check S&P 500' },
    streak: 0,
  },
  {
    id: 'h3',
    name: 'Social Media < 30m',
    icon: 'Smartphone',
    interest: InterestType.DETOX,
    schedule: ScheduleType.DAILY,
    triggerType: TriggerType.SCREEN_TIME,
    triggerConfig: { thresholdMinutes: 30 },
    streak: 0,
  },
  {
    id: 'h4',
    name: 'Read 1 Chapter',
    icon: 'BookOpen',
    interest: InterestType.LEARNING,
    schedule: ScheduleType.DAILY,
    triggerType: TriggerType.MANUAL,
    streak: 0,
  },
  {
    id: 'h5',
    name: 'Deep Work Session',
    icon: 'Zap',
    interest: InterestType.PRODUCTIVITY,
    schedule: ScheduleType.WEEKDAYS,
    triggerType: TriggerType.APP_OPEN,
    triggerConfig: { appName: 'Timer Started' },
    streak: 0,
  }
];

// --- SERVICE CLASS ---

class MockDBService {
  private dbPromise: Promise<IDBPDatabase<MyCoreDB>>;
  private currentUserCache: User | null = null;

  constructor() {
    this.dbPromise = openDB<MyCoreDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('by-email', 'email', { unique: true });

        db.createObjectStore('habits', { keyPath: 'id' });
        
        const instStore = db.createObjectStore('instances', { keyPath: 'id' });
        instStore.createIndex('by-date', 'date');
        instStore.createIndex('by-habit', 'habitId');

        db.createObjectStore('tasks', { keyPath: 'id' });
        db.createObjectStore('projects', { keyPath: 'id' });
      },
    });
  }

  // --- SUGGESTION ENGINE ---
  getSuggestions(interests: InterestType[]): Habit[] {
    let suggestions = SUGGESTED_HABITS.filter(h => interests.includes(h.interest));
    if (suggestions.length < 5) {
        const remaining = 5 - suggestions.length;
        const defaults = SUGGESTED_HABITS.filter(h => !suggestions.find(s => s.id === h.id)).slice(0, remaining);
        suggestions = [...suggestions, ...defaults];
    }
    return suggestions.slice(0, 5);
  }

  // USER
  async getUser(): Promise<User | null> {
    if (this.currentUserCache) return this.currentUserCache;
    // For MVP, we'll try to get the first user if cache is empty
    const db = await this.dbPromise;
    const users = await db.getAll('users');
    if (users.length > 0) {
      this.currentUserCache = users[0];
      return users[0];
    }
    return null;
  }

  async initUser(email: string, name: string): Promise<User> {
    const db = await this.dbPromise;
    const existing = await db.getFromIndex('users', 'by-email', email);
    
    if (existing) {
        this.currentUserCache = existing;
        return existing;
    }

    const newUser: User = {
      id: 'u_' + Math.random().toString(36).substr(2, 9),
      email,
      name,
      onboarded: false,
      interests: [],
      settings: { locationEnabled: false, notificationsEnabled: false, screenTimeEnabled: false }
    };
    
    await db.put('users', newUser);
    this.currentUserCache = newUser;
    return newUser;
  }

  async completeOnboarding(
    userId: string, 
    interests: InterestType[], 
    habits: Habit[], 
    permissions: { loc: boolean; notif: boolean; screen: boolean }
  ): Promise<void> {
    const db = await this.dbPromise;
    const user = await db.get('users', userId);
    
    if (user) {
        user.interests = interests;
        user.onboarded = true;
        user.settings = {
            locationEnabled: permissions.loc,
            notificationsEnabled: permissions.notif,
            screenTimeEnabled: permissions.screen
        };
        await db.put('users', user);
        this.currentUserCache = user;

        // Save habits
        const tx = db.transaction('habits', 'readwrite');
        await Promise.all(habits.map(h => tx.store.put(h)));
        await tx.done;

        // Seed instances
        await this.seedInstancesForWeek(habits);
    }
  }

  async updateUserSettings(settings: User['settings']): Promise<void> {
    const user = await this.getUser();
    if (user) {
      const db = await this.dbPromise;
      user.settings = settings;
      await db.put('users', user);
      this.currentUserCache = user;
    }
  }

  // HABITS
  async getHabits(): Promise<Habit[]> {
    const db = await this.dbPromise;
    const habits = await db.getAll('habits');
    const instances = await db.getAll('instances');
    
    // Update streaks dynamically
    for (const habit of habits) {
        const habitInstances = instances.filter(i => i.habitId === habit.id);
        const score = this.calculateHabitStrength(habit, habitInstances);
        // Note: We update the object in memory returned, 
        // ideally we should persist the streak back to DB if we want it stored,
        // but calculating on read is safer for consistency.
        habit.streak = habit.streak; // assigned inside calc
    }
    return habits;
  }

  private calculateHabitStrength(habit: Habit, instances: HabitInstance[]): number {
    const sorted = [...instances].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let currentStreak = 0;
    const todayStr = formatDate(new Date());

    // Calculate Streak (Consecutive days ending today or yesterday)
    for (const inst of sorted) {
        if (inst.completed) {
            currentStreak++;
        } else {
             // If it's today and not done yet, don't break streak from yesterday
             if (inst.date === todayStr) continue;
             break; 
        }
    }
    habit.streak = currentStreak;

    // Calculate Strength Score
    const totalCompleted = sorted.filter(i => i.completed).length;
    const totalInstances = sorted.length;
    
    if (totalInstances === 0) return 0;

    const completionRate = (totalCompleted / totalInstances) * 100;
    const streakBonus = (Math.min(currentStreak, 21) / 21) * 100;

    return Math.round((completionRate * 0.7) + (streakBonus * 0.3));
  }

  // INSTANCES
  async getInstancesForDate(dateStr: string): Promise<HabitInstance[]> {
    const db = await this.dbPromise;
    let instances = await db.getAllFromIndex('instances', 'by-date', dateStr);
    
    if (instances.length === 0) {
      // Lazy create
      const habits = await db.getAll('habits');
      if (habits.length > 0) {
        instances = this.createInstancesForDay(dateStr, habits);
        const tx = db.transaction('instances', 'readwrite');
        await Promise.all(instances.map(i => tx.store.put(i)));
        await tx.done;
      }
    }
    return instances;
  }

  async getWeekInstances(dates: string[]): Promise<HabitInstance[]> {
    // Optimized: get all instances in one go if possible, but index range is tricky with non-consecutive string dates
    // Simple loop is fine for IDB speed
    let all: HabitInstance[] = [];
    for (const date of dates) {
      const dayInstances = await this.getInstancesForDate(date);
      all = [...all, ...dayInstances];
    }
    return all;
  }

  async updateInstanceStatus(instanceId: string, completed: boolean, value?: number): Promise<void> {
    const db = await this.dbPromise;
    const instance = await db.get('instances', instanceId);
    if (instance) {
        instance.completed = completed;
        if (completed) instance.completedAt = new Date().toISOString();
        if (value !== undefined) instance.value = value;
        await db.put('instances', instance);
    }
  }

  // --- TASKS & PROJECTS ---

  async getTasks(): Promise<Task[]> {
    const db = await this.dbPromise;
    return db.getAll('tasks');
  }

  async addTask(task: Task): Promise<void> {
    const db = await this.dbPromise;
    await db.put('tasks', task);
    if (task.projectId) {
      await this.updateProjectProgress(task.projectId);
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const db = await this.dbPromise;
    const task = await db.get('tasks', taskId);
    if (task) {
      const updated = { ...task, ...updates };
      await db.put('tasks', updated);
      if (updated.projectId) {
        await this.updateProjectProgress(updated.projectId);
      }
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    const db = await this.dbPromise;
    const task = await db.get('tasks', taskId);
    await db.delete('tasks', taskId);
    if (task?.projectId) {
      await this.updateProjectProgress(task.projectId);
    }
  }

  async getProjects(): Promise<Project[]> {
    const db = await this.dbPromise;
    return db.getAll('projects');
  }

  async addProject(project: Project): Promise<void> {
    const db = await this.dbPromise;
    await db.put('projects', project);
  }

  private async updateProjectProgress(projectId: string): Promise<void> {
    const db = await this.dbPromise;
    const allTasks = await db.getAll('tasks');
    const projectTasks = allTasks.filter(t => t.projectId === projectId);
    
    const total = projectTasks.length;
    const completed = projectTasks.filter(t => t.completed).length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

    const project = await db.get('projects', projectId);
    if (project) {
        project.progress = progress;
        if (progress === 100) project.status = 'completed';
        else if (project.status === 'completed' && progress < 100) project.status = 'active';
        await db.put('projects', project);
    }
  }

  // UTILS
  private createInstancesForDay(dateStr: string, habits: Habit[]): HabitInstance[] {
     const date = new Date(dateStr);
     const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
     const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

     return habits
        .filter(h => {
            if (h.schedule === ScheduleType.DAILY) return true;
            if (h.schedule === ScheduleType.WEEKDAYS) return !isWeekend;
            if (h.schedule === ScheduleType.WEEKENDS) return isWeekend;
            return true;
        })
        .map(h => ({
            id: `${dateStr}_${h.id}`,
            habitId: h.id,
            date: dateStr,
            completed: false
        }));
  }

  private async seedInstancesForWeek(habits: Habit[]) {
    const db = await this.dbPromise;
    const today = new Date();
    
    // Generate for last 2 weeks and next few days
    for (let i = -14; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = formatDate(d);
      const isPast = i < 0;
      
      const existing = await db.getAllFromIndex('instances', 'by-date', dateStr);
      if (existing.length === 0) {
        const instances = this.createInstancesForDay(dateStr, habits);
        if (isPast) {
            instances.forEach(inst => {
                // Simulate some past activity for demo
                if (Math.random() > 0.3) {
                    inst.completed = true;
                    inst.completedAt = new Date().toISOString();
                }
            });
        }
        const tx = db.transaction('instances', 'readwrite');
        await Promise.all(instances.map(i => tx.store.put(i)));
        await tx.done;
      }
    }
  }

  async reset() {
    const db = await this.dbPromise;
    const tx = db.transaction(['users', 'habits', 'instances', 'tasks', 'projects'], 'readwrite');
    await tx.objectStore('users').clear();
    await tx.objectStore('habits').clear();
    await tx.objectStore('instances').clear();
    await tx.objectStore('tasks').clear();
    await tx.objectStore('projects').clear();
    await tx.done;
    this.currentUserCache = null;
  }
}

export const db = new MockDBService();
