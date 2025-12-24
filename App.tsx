import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, Habit, HabitInstance, InterestType, Task, Project } from './types';
import { db } from './services/mockDb';
import { AuthService } from './services/auth';
import { formatDate, getWeekDays } from './utils';
import { NotificationService } from './services/notificationService';

// Icons
import { 
  LayoutDashboard, Compass, BarChart2, Settings, Loader2, CheckSquare, 
  LogOut, Sun, Moon, Search, Bell, Menu, X
} from 'lucide-react';

// Components
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Interests from './components/Interests';
import Analytics from './components/Analytics';
import SettingsPage from './components/SettingsPage';
import TasksPage from './components/TasksPage';

// --- CONTEXT ---
interface AppContextType {
  user: User | null;
  habits: Habit[];
  currentWeekInstances: Record<string, HabitInstance[]>;
  tasks: Task[];
  projects: Project[];
  refreshData: () => Promise<void>;
  isLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  completeOnboarding: (interests: InterestType[], finalHabits: Habit[], permissions: any) => Promise<void>;
  handleTrigger: (instanceId: string, value?: number) => Promise<void>;
  updateSettings: (settings: User['settings']) => Promise<void>;
  resetApp: () => Promise<void>;
  isAuthenticated: boolean;
  handleLoginSuccess: (email: string, name: string) => void;
  // Task Helpers
  addTask: (task: Task) => Promise<void>;
  toggleTask: (taskId: string, completed: boolean) => Promise<void>;
  addProject: (project: Project) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  // Habit Helpers
  toggleHabitFavorite: (habitId: string) => Promise<void>;
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

// --- MAIN APP ---

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentWeekInstances, setCurrentWeekInstances] = useState<Record<string, HabitInstance[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [remindersSent, setRemindersSent] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Check Auth Status on Mount and Listen to Auth Changes
  useEffect(() => {
    // Subscribe to auth state changes
    const subscription = AuthService.onAuthStateChange((session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        loadUserProfile(
          session.user.email || '',
          session.user.user_metadata?.name || 'User'
        );
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
      }
    });

    // Check initial session
    AuthService.getSession().then(session => {
      if (session?.user) {
        setIsAuthenticated(true);
        loadUserProfile(
          session.user.email || '',
          session.user.user_metadata?.name || 'User'
        );
      } else {
        setIsLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (email: string, name: string) => {
    setIsLoading(true);
    try {
        const u = await db.initUser(email, name);
        setUser(u);
        if (u && u.onboarded) {
            await refreshData();
        }
    } catch (e) {
        console.error("Failed to load user profile", e);
    }
    setIsLoading(false);
  };

  const handleLoginSuccess = async (email: string, name: string) => {
    setIsAuthenticated(true);
    await loadUserProfile(email, name);
  };

  const refreshData = async () => {
    const u = await db.getUser();
    setUser(u);
    
    if (u && u.onboarded) {
      const h = await db.getHabits();
      setHabits(h);

      const t = await db.getTasks();
      setTasks(t);

      const p = await db.getProjects();
      setProjects(p);
      
      const weekDates = getWeekDays().map(formatDate);
      const instances = await db.getWeekInstances(weekDates);
      
      const grouped: Record<string, HabitInstance[]> = {};
      weekDates.forEach(d => grouped[d] = []);
      instances.forEach(i => {
        const date = i.date; 
        if (grouped[date]) grouped[date].push(i);
      });
      setCurrentWeekInstances(grouped);
    }
  };

  // Check for Reminders
  useEffect(() => {
    if (user?.settings.notificationsEnabled && !remindersSent) {
      const checkReminders = () => {
        const today = formatDate(new Date());
        
        // 1. Habits
        const todaysInstances = currentWeekInstances[today] || [];
        if (todaysInstances.length > 0 && habits.length > 0) {
            NotificationService.sendReminderForHabits(habits, todaysInstances);
        }

        // 2. Tasks
        const dueTasks = tasks.filter(t => !t.completed && t.dueDate === today);
        if (dueTasks.length > 0) {
           NotificationService.send('Task Reminder', `You have ${dueTasks.length} tasks due today: ${dueTasks.map(t => t.title).join(', ')}`);
        }
        
        setRemindersSent(true);
      };

      // Delay check slightly
      const timer = setTimeout(checkReminders, 3000);
      return () => clearTimeout(timer);
    }
  }, [user, habits, tasks, currentWeekInstances, remindersSent]);

  const completeOnboarding = async (interests: InterestType[], finalHabits: Habit[], permissions: any) => {
    if (!user) return;
    setIsLoading(true);
    await db.completeOnboarding(user.id, interests, finalHabits, permissions);
    await refreshData();
    setIsLoading(false);
  };

  const updateSettings = async (newSettings: User['settings']) => {
    if (user) {
      const updatedUser = { ...user, settings: newSettings };
      setUser(updatedUser);
      await db.updateUserSettings(newSettings);
      if (newSettings.notificationsEnabled) {
        await NotificationService.requestPermission();
      }
    }
  };

  const handleTrigger = async (instanceId: string, value?: number) => {
    const [dateStr] = instanceId.split('_'); 
    let targetDate = dateStr;
    let target = null;
    
    // Search in current week structure
    for(const d in currentWeekInstances) {
        const found = currentWeekInstances[d].find(i => i.id === instanceId);
        if (found) {
            targetDate = d;
            target = found;
            break;
        }
    }
    
    if (target) {
        const habit = habits.find(h => h.id === target?.habitId);
        
        let newState = !target.completed;
        
        // If Habit has a Goal, calculate completion based on value
        if (habit?.goal && value !== undefined) {
             newState = value >= habit.goal.target;
        }
        
        const newInstances = { ...currentWeekInstances };
        newInstances[targetDate] = newInstances[targetDate].map(i => 
            i.id === instanceId ? { ...i, completed: newState, value: value !== undefined ? value : i.value } : i
        );
        setCurrentWeekInstances(newInstances);

        if (newState && user?.settings.notificationsEnabled) {
            if (habit && habit.streak >= 3) {
                 if (Math.random() > 0.7) NotificationService.sendStreakCongratulation(habit.name, habit.streak);
            }
            const allDone = newInstances[targetDate].every(i => i.completed);
            if (allDone) {
                NotificationService.sendCompletionCongratulation();
            }
        }
        await db.updateInstanceStatus(instanceId, newState, value);
    }
  };

  const resetApp = async () => {
    await AuthService.logout();
    await db.reset();
    setIsAuthenticated(false);
    setUser(null);
    setHabits([]);
    setTasks([]);
    setProjects([]);
    setCurrentWeekInstances({});
    setActiveTab('dashboard');
  }

  // --- TASK ACTIONS ---
  const addTask = async (task: Task) => {
    await db.addTask(task);
    await refreshData();
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    await db.updateTask(taskId, { completed });
    await refreshData();
  };

  const addProject = async (project: Project) => {
    await db.addProject(project);
    await refreshData();
  };

  const deleteTask = async (taskId: string) => {
    await db.deleteTask(taskId);
    await refreshData();
  };
  
  const toggleHabitFavorite = async (habitId: string) => {
    await db.toggleHabitFavorite(habitId);
    await refreshData();
  };


  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F5F5F7] dark:bg-dark-bg text-navy-900 dark:text-white relative overflow-hidden transition-colors duration-500">
        <div className="relative z-10 flex flex-col items-center">
            <Loader2 className="w-10 h-10 animate-spin text-navy-900/50 dark:text-white/50 mb-4" />
            <p className="text-sm font-medium opacity-50">Loading Core...</p>
        </div>
      </div>
    );
  }

  const contextValue = { 
    user, habits, currentWeekInstances, tasks, projects, refreshData, isLoading, 
    activeTab, setActiveTab, completeOnboarding, handleTrigger, 
    updateSettings, resetApp, isAuthenticated, handleLoginSuccess,
    addTask, toggleTask, addProject, deleteTask, toggleHabitFavorite,
    theme, toggleTheme
  };

  return (
    <AppContext.Provider value={contextValue}>
      {!isAuthenticated ? (
        <Auth onSuccess={handleLoginSuccess} />
      ) : !user?.onboarded ? (
        <Onboarding />
      ) : (
        <div className="flex h-screen bg-[#F5F5F7] dark:bg-dark-bg transition-colors duration-500 font-sans text-navy-900 dark:text-dark-text overflow-hidden">
          
          {/* SIDEBAR NAVIGATION (Desktop) */}
          <aside className="hidden md:flex flex-col w-20 lg:w-64 bg-white dark:bg-dark-card border-r border-slate-200 dark:border-dark-border transition-all duration-300 z-50">
             <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-transparent dark:border-dark-border/50">
                <div className="relative group flex items-center gap-3">
                  <div className="w-9 h-9 bg-navy-900 dark:bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-glow transition-all">
                    GN
                  </div>
                  <span className="hidden lg:block font-bold text-lg tracking-tight">myCORE</span>
                </div>
             </div>

             <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
                  { id: 'interests', label: 'Interests', icon: Compass },
                  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
                  { id: 'settings', label: 'Settings', icon: Settings },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      relative group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                      ${activeTab === tab.id 
                        ? 'bg-navy-900 text-white dark:bg-blue-600 dark:text-white shadow-lg shadow-navy-900/20 dark:shadow-blue-900/20' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-cardHover hover:text-navy-900 dark:hover:text-white'
                      }
                    `}
                  >
                    <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} className="shrink-0" />
                    <span className="hidden lg:block font-medium text-sm">{tab.label}</span>
                    {activeTab === tab.id && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-400 rounded-r-full lg:hidden" />
                    )}
                  </button>
                ))}
             </nav>

             <div className="p-4 border-t border-slate-100 dark:border-dark-border">
                <button 
                  onClick={resetApp}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-all"
                >
                  <LogOut size={20} />
                  <span className="hidden lg:block font-medium text-sm">Logout</span>
                </button>
             </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
             
             {/* TOP HEADER */}
             <header className="h-16 bg-white/60 dark:bg-dark-card/80 backdrop-blur-md border-b border-slate-200 dark:border-dark-border flex items-center justify-between px-6 z-40 transition-colors duration-300">
                
                {/* Mobile Menu Trigger */}
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 -ml-2 text-navy-900 dark:text-white"
                >
                   {isMobileMenuOpen ? <X /> : <Menu />}
                </button>

                {/* Search Bar */}
                <div className="hidden md:flex items-center gap-3 bg-slate-100 dark:bg-dark-bg px-4 py-2 rounded-full w-full max-w-md border border-transparent focus-within:border-blue-500 transition-all">
                   <Search size={16} className="text-slate-400" />
                   <input 
                      placeholder="Enter your search request..." 
                      className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400 text-navy-900 dark:text-white"
                   />
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4">
                   <button 
                      onClick={toggleTheme}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-dark-cardHover transition-all"
                   >
                      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                   </button>
                   
                   <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-dark-cardHover transition-all relative">
                      <Bell size={20} />
                      <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-dark-card" />
                   </button>

                   <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-dark-border">
                      <div className="text-right">
                         <div className="text-sm font-bold text-navy-900 dark:text-white leading-none">{user?.name}</div>
                         <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">Pro Plan</div>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                         {user?.name.charAt(0)}
                      </div>
                   </div>
                </div>
             </header>

             {/* SCROLLABLE PAGE CONTENT */}
             <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                <div className="max-w-7xl mx-auto animate-fade-in">
                  {activeTab === 'dashboard' && <Dashboard />}
                  {activeTab === 'tasks' && <TasksPage />}
                  {activeTab === 'interests' && <Interests />}
                  {activeTab === 'analytics' && <Analytics />}
                  {activeTab === 'settings' && <SettingsPage />}
                </div>
             </main>
          </div>

          {/* MOBILE NAVIGATION DRAWER */}
          {isMobileMenuOpen && (
             <div className="fixed inset-0 z-50 md:hidden">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                <div className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-dark-card shadow-2xl p-6 animate-slide-right">
                   <div className="flex items-center justify-between mb-8">
                      <div className="font-bold text-xl dark:text-white">myCORE</div>
                      <button onClick={() => setIsMobileMenuOpen(false)}><X className="dark:text-white"/></button>
                   </div>
                   <nav className="flex flex-col gap-2">
                      {[
                        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                        { id: 'tasks', label: 'Tasks', icon: CheckSquare },
                        { id: 'interests', label: 'Interests', icon: Compass },
                        { id: 'analytics', label: 'Analytics', icon: BarChart2 },
                        { id: 'settings', label: 'Settings', icon: Settings },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
                          className={`flex items-center gap-3 p-3 rounded-xl font-medium ${activeTab === tab.id ? 'bg-navy-900 text-white dark:bg-blue-600' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                          <tab.icon size={20} /> {tab.label}
                        </button>
                      ))}
                   </nav>
                   <div className="mt-auto pt-6 border-t dark:border-dark-border">
                      <button onClick={resetApp} className="flex items-center gap-3 text-red-500 font-medium"><LogOut size={20}/> Logout</button>
                   </div>
                </div>
             </div>
          )}
        </div>
      )}
    </AppContext.Provider>
  );
}