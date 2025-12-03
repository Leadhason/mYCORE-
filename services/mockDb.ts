import { Habit, HabitInstance, InterestType, TriggerType, User, ScheduleType, Task, Project } from '../types';
import { formatDate } from '../utils';

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
  private currentUserCache: User | null = null;
  private readonly KEYS = {
    USER: 'mycore_user',
    HABITS: 'mycore_habits',
    INSTANCES: 'mycore_instances',
    TASKS: 'mycore_tasks',
    PROJECTS: 'mycore_projects'
  };

  constructor() {
    // Initialize if empty
    if (!localStorage.getItem(this.KEYS.HABITS)) {
        // No global seed needed for localStorage as it is user specific usually, 
        // but for this demo we just wait for user creation.
    }
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
    
    const stored = localStorage.getItem(this.KEYS.USER);
    if (stored) {
      this.currentUserCache = JSON.parse(stored);
      return this.currentUserCache;
    }
    return null;
  }

  async initUser(email: string, name: string): Promise<User> {
    // Check if exists in local storage
    const stored = localStorage.getItem(this.KEYS.USER);
    if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.email === email) {
            this.currentUserCache = parsed;
            return parsed;
        }
    }

    // Create new
    const newUser: User = {
      id: 'u_' + Math.random().toString(36).substr(2, 9),
      email,
      name,
      onboarded: false,
      interests: [],
      settings: { locationEnabled: false, notificationsEnabled: false, screenTimeEnabled: false }
    };
    
    localStorage.setItem(this.KEYS.USER, JSON.stringify(newUser));
    // Clear other data for fresh user
    localStorage.removeItem(this.KEYS.HABITS);
    localStorage.removeItem(this.KEYS.INSTANCES);
    localStorage.removeItem(this.KEYS.TASKS);
    localStorage.removeItem(this.KEYS.PROJECTS);

    this.currentUserCache = newUser;
    return newUser;
  }

  async completeOnboarding(
    userId: string, 
    interests: InterestType[], 
    habits: Habit[], 
    permissions: { loc: boolean; notif: boolean; screen: boolean }
  ): Promise<void> {
    const user = await this.getUser();
    
    if (user && user.id === userId) {
        user.interests = interests;
        user.onboarded = true;
        user.settings = {
            locationEnabled: permissions.loc,
            notificationsEnabled: permissions.notif,
            screenTimeEnabled: permissions.screen
        };
        localStorage.setItem(this.KEYS.USER, JSON.stringify(user));
        this.currentUserCache = user;

        // Save habits
        localStorage.setItem(this.KEYS.HABITS, JSON.stringify(habits));

        // Seed instances
        await this.seedInstancesForWeek(habits);
    }
  }

  async updateUserSettings(settings: User['settings']): Promise<void> {
    const user = await this.getUser();
    if (user) {
      user.settings = settings;
      localStorage.setItem(this.KEYS.USER, JSON.stringify(user));
      this.currentUserCache = user;
    }
  }

  // HABITS
  async getHabits(): Promise<Habit[]> {
    const stored = localStorage.getItem(this.KEYS.HABITS);
    const habits: Habit[] = stored ? JSON.parse(stored) : [];
    
    const storedInst = localStorage.getItem(this.KEYS.INSTANCES);
    const instances: HabitInstance[] = storedInst ? JSON.parse(storedInst) : [];

    // Update streaks dynamically
    for (const habit of habits) {
        const habitInstances = instances.filter(i => i.habitId === habit.id);
        this.calculateHabitStrength(habit, habitInstances);
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
    const stored = localStorage.getItem(this.KEYS.INSTANCES);
    let allInstances: HabitInstance[] = stored ? JSON.parse(stored) : [];
    
    let dayInstances = allInstances.filter(i => i.date === dateStr);
    
    if (dayInstances.length === 0) {
      // Lazy create
      const habits = await this.getHabits();
      if (habits.length > 0) {
        dayInstances = this.createInstancesForDay(dateStr, habits);
        allInstances = [...allInstances, ...dayInstances];
        localStorage.setItem(this.KEYS.INSTANCES, JSON.stringify(allInstances));
      }
    }
    return dayInstances;
  }

  async getWeekInstances(dates: string[]): Promise<HabitInstance[]> {
    const stored = localStorage.getItem(this.KEYS.INSTANCES);
    let allInstances: HabitInstance[] = stored ? JSON.parse(stored) : [];
    let weekInstances: HabitInstance[] = [];

    // Ensure all days exist
    let hasChanges = false;
    const habits = await this.getHabits();

    if (habits.length > 0) {
        for (const date of dates) {
            const dayInst = allInstances.filter(i => i.date === date);
            if (dayInst.length === 0) {
                const created = this.createInstancesForDay(date, habits);
                allInstances = [...allInstances, ...created];
                weekInstances = [...weekInstances, ...created];
                hasChanges = true;
            } else {
                weekInstances = [...weekInstances, ...dayInst];
            }
        }
    }
    
    if (hasChanges) {
        localStorage.setItem(this.KEYS.INSTANCES, JSON.stringify(allInstances));
    }

    return weekInstances;
  }

  async updateInstanceStatus(instanceId: string, completed: boolean, value?: number): Promise<void> {
    const stored = localStorage.getItem(this.KEYS.INSTANCES);
    if (!stored) return;

    const instances: HabitInstance[] = JSON.parse(stored);
    const idx = instances.findIndex(i => i.id === instanceId);
    
    if (idx !== -1) {
        instances[idx].completed = completed;
        if (completed) instances[idx].completedAt = new Date().toISOString();
        if (value !== undefined) instances[idx].value = value;
        localStorage.setItem(this.KEYS.INSTANCES, JSON.stringify(instances));
    }
  }

  // --- TASKS & PROJECTS ---

  async getTasks(): Promise<Task[]> {
    const stored = localStorage.getItem(this.KEYS.TASKS);
    return stored ? JSON.parse(stored) : [];
  }

  async addTask(task: Task): Promise<void> {
    const tasks = await this.getTasks();
    tasks.push(task);
    localStorage.setItem(this.KEYS.TASKS, JSON.stringify(tasks));
    if (task.projectId) {
      await this.updateProjectProgress(task.projectId);
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const tasks = await this.getTasks();
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      const updated = { ...tasks[idx], ...updates };
      tasks[idx] = updated;
      localStorage.setItem(this.KEYS.TASKS, JSON.stringify(tasks));
      if (updated.projectId) {
        await this.updateProjectProgress(updated.projectId);
      }
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    const filtered = tasks.filter(t => t.id !== taskId);
    localStorage.setItem(this.KEYS.TASKS, JSON.stringify(filtered));
    if (task?.projectId) {
      await this.updateProjectProgress(task.projectId);
    }
  }

  async getProjects(): Promise<Project[]> {
    const stored = localStorage.getItem(this.KEYS.PROJECTS);
    return stored ? JSON.parse(stored) : [];
  }

  async addProject(project: Project): Promise<void> {
    const projects = await this.getProjects();
    projects.push(project);
    localStorage.setItem(this.KEYS.PROJECTS, JSON.stringify(projects));
  }

  private async updateProjectProgress(projectId: string): Promise<void> {
    const tasks = await this.getTasks();
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    
    const total = projectTasks.length;
    const completed = projectTasks.filter(t => t.completed).length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

    const projects = await this.getProjects();
    const idx = projects.findIndex(p => p.id === projectId);
    if (idx !== -1) {
        projects[idx].progress = progress;
        if (progress === 100) projects[idx].status = 'completed';
        else if (projects[idx].status === 'completed' && progress < 100) projects[idx].status = 'active';
        localStorage.setItem(this.KEYS.PROJECTS, JSON.stringify(projects));
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
    const stored = localStorage.getItem(this.KEYS.INSTANCES);
    let allInstances: HabitInstance[] = stored ? JSON.parse(stored) : [];
    
    const today = new Date();
    
    // Generate for last 2 weeks and next few days
    for (let i = -14; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = formatDate(d);
      const isPast = i < 0;
      
      const existing = allInstances.filter(inst => inst.date === dateStr);
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
        allInstances = [...allInstances, ...instances];
      }
    }
    localStorage.setItem(this.KEYS.INSTANCES, JSON.stringify(allInstances));
  }

  async reset() {
    localStorage.clear();
    this.currentUserCache = null;
  }
}

export const db = new MockDBService();