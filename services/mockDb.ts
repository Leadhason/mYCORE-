import { Habit, HabitInstance, InterestType, TriggerType, User, ScheduleType, Task, Project, Priority } from '../types';
import { formatDate, calculateHabitStrength, getHabitStreak } from '../utils';

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

// --- STORAGE KEY ---
const DB_KEY = 'mycore_db_v1';

interface DbSchema {
  user: User | null;
  habits: Habit[];
  instances: Record<string, HabitInstance[]>; // Key is YYYY-MM-DD
  tasks: Task[];
  projects: Project[];
}

// --- SERVICE CLASS ---

class MockDBService {
  private data: DbSchema;

  constructor() {
    const stored = localStorage.getItem(DB_KEY);
    if (stored) {
      this.data = JSON.parse(stored);
      // Migration for old DBs
      if (!this.data.tasks) this.data.tasks = [];
      if (!this.data.projects) this.data.projects = [];
    } else {
      this.data = {
        user: null,
        habits: [],
        instances: {},
        tasks: [],
        projects: []
      };
    }
  }

  private save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this.data));
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
    return this.data.user;
  }

  async initUser(email: string, name: string): Promise<User> {
    if (this.data.user && this.data.user.email === email) {
        return this.data.user;
    }
    const newUser: User = {
      id: 'u_' + Math.random().toString(36).substr(2, 9),
      email,
      name,
      onboarded: false,
      interests: [],
      settings: { locationEnabled: false, notificationsEnabled: false, screenTimeEnabled: false }
    };
    this.data.user = newUser;
    this.data.habits = [];
    this.data.instances = {};
    this.data.tasks = [];
    this.data.projects = [];
    this.save();
    return newUser;
  }

  async completeOnboarding(
    userId: string, 
    interests: InterestType[], 
    habits: Habit[], 
    permissions: { loc: boolean; notif: boolean; screen: boolean }
  ): Promise<void> {
    if (this.data.user && this.data.user.id === userId) {
        this.data.user.interests = interests;
        this.data.user.onboarded = true;
        this.data.user.settings = {
            locationEnabled: permissions.loc,
            notificationsEnabled: permissions.notif,
            screenTimeEnabled: permissions.screen
        };
        this.data.habits = habits;
        this.seedInstancesForWeek();
        this.save();
    }
  }

  async updateUserSettings(settings: User['settings']): Promise<void> {
    if (this.data.user) {
      this.data.user.settings = settings;
      this.save();
    }
  }

  // HABITS
  async getHabits(): Promise<Habit[]> {
    const habits = this.data.habits;
    const allInstances = Object.values(this.data.instances).flat();
    habits.forEach(h => {
        const habitInstances = allInstances.filter(i => i.habitId === h.id);
        h.streak = getHabitStreak(habitInstances);
        // We could also store strength if we wanted to
        // h.strength = calculateHabitStrength(h, habitInstances); 
    });
    return habits;
  }

  // INSTANCES
  async getInstancesForDate(dateStr: string): Promise<HabitInstance[]> {
    if (!this.data.instances[dateStr]) {
      this.data.instances[dateStr] = this.createInstancesForDay(dateStr);
      this.save();
    }
    return this.data.instances[dateStr];
  }

  async getWeekInstances(dates: string[]): Promise<HabitInstance[]> {
    let all: HabitInstance[] = [];
    for (const date of dates) {
      const dayInstances = await this.getInstancesForDate(date);
      all = [...all, ...dayInstances];
    }
    return all;
  }

  async updateInstanceStatus(instanceId: string, completed: boolean, value?: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600)); 
    let found = false;
    for (const date in this.data.instances) {
      const idx = this.data.instances[date].findIndex(i => i.id === instanceId);
      if (idx !== -1) {
        this.data.instances[date][idx].completed = completed;
        if (completed) this.data.instances[date][idx].completedAt = new Date().toISOString();
        if (value !== undefined) this.data.instances[date][idx].value = value;
        found = true;
        break;
      }
    }
    if (found) this.save();
  }

  // --- TASKS & PROJECTS ---

  async getTasks(): Promise<Task[]> {
    return this.data.tasks || [];
  }

  async addTask(task: Task): Promise<void> {
    this.data.tasks.push(task);
    if (task.projectId) {
      await this.updateProjectProgress(task.projectId);
    }
    this.save();
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const idx = this.data.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      this.data.tasks[idx] = { ...this.data.tasks[idx], ...updates };
      if (this.data.tasks[idx].projectId) {
        await this.updateProjectProgress(this.data.tasks[idx].projectId!);
      }
      this.save();
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    const task = this.data.tasks.find(t => t.id === taskId);
    this.data.tasks = this.data.tasks.filter(t => t.id !== taskId);
    if (task?.projectId) {
      await this.updateProjectProgress(task.projectId);
    }
    this.save();
  }

  async getProjects(): Promise<Project[]> {
    return this.data.projects || [];
  }

  async addProject(project: Project): Promise<void> {
    this.data.projects.push(project);
    this.save();
  }

  private async updateProjectProgress(projectId: string): Promise<void> {
    const projectIdx = this.data.projects.findIndex(p => p.id === projectId);
    if (projectIdx === -1) return;

    const projectTasks = this.data.tasks.filter(t => t.projectId === projectId);
    const total = projectTasks.length;
    const completed = projectTasks.filter(t => t.completed).length;

    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    this.data.projects[projectIdx].progress = progress;
    if (progress === 100) this.data.projects[projectIdx].status = 'completed';
    else if (this.data.projects[projectIdx].status === 'completed' && progress < 100) {
      this.data.projects[projectIdx].status = 'active';
    }
  }

  // UTILS
  private createInstancesForDay(dateStr: string): HabitInstance[] {
     const date = new Date(dateStr);
     const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
     const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

     return this.data.habits
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

  private seedInstancesForWeek() {
    const today = new Date();
    for (let i = -14; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = formatDate(d);
      const isPast = i < 0;
      if (!this.data.instances[dateStr]) {
        const instances = this.createInstancesForDay(dateStr);
        if (isPast) {
            instances.forEach(inst => {
                if (Math.random() > 0.3) {
                    inst.completed = true;
                    inst.completedAt = new Date().toISOString();
                }
            });
        }
        this.data.instances[dateStr] = instances;
      }
    }
  }

  async reset() {
    this.data = { user: null, habits: [], instances: {}, tasks: [], projects: [] };
    this.save();
  }
}

export const db = new MockDBService();