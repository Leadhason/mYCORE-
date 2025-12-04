import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, Habit, HabitInstance, InterestType, Task, Project } from './types';
import { db } from './services/mockDb';
import { AuthService } from './services/auth';
import { formatDate, getWeekDays } from './utils';
import { NotificationService } from './services/notificationService';

// Icons
import { LayoutDashboard, Compass, BarChart2, Settings, Loader2, CheckSquare } from 'lucide-react';

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

  // Check Auth Status on Mount
  useEffect(() => {
    AuthService.getSession().then(session => {
        if (session && session.user) {
            setIsAuthenticated(true);
            loadUserProfile(session.user.email || '', session.user.user_metadata.name || 'User');
        } else {
            setIsLoading(false);
        }
    });
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
        const newState = !target.completed;
        const newInstances = { ...currentWeekInstances };
        newInstances[targetDate] = newInstances[targetDate].map(i => 
            i.id === instanceId ? { ...i, completed: newState } : i
        );
        setCurrentWeekInstances(newInstances);

        if (newState && user?.settings.notificationsEnabled) {
            const habit = habits.find(h => h.id === target?.habitId);
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


  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F5F5F7] text-navy-900">
        <Loader2 className="w-10 h-10 animate-spin text-navy-900/50" />
      </div>
    );
  }

  const contextValue = { 
    user, habits, currentWeekInstances, tasks, projects, refreshData, isLoading, 
    activeTab, setActiveTab, completeOnboarding, handleTrigger, 
    updateSettings, resetApp, isAuthenticated, handleLoginSuccess,
    addTask, toggleTask, addProject, deleteTask
  };

  return (
    <AppContext.Provider value={contextValue}>
      {!isAuthenticated ? (
        <Auth onSuccess={handleLoginSuccess} />
      ) : !user?.onboarded ? (
        <Onboarding />
      ) : (
        <div className="min-h-screen flex flex-col bg-[#F5F5F7] font-sans selection:bg-navy-900/20">
          
          {/* HEADER */}
          <header className="sticky top-0 z-40 bg-white/75 backdrop-blur-xl border-b border-black/5 transition-all">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img 
                    src="/logo.png" 
                    alt="Growth Nexis Global" 
                    className="w-9 h-9 object-contain drop-shadow-sm transition-transform hover:scale-105" 
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden w-9 h-9 bg-navy-900 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-glow">
                    GN
                  </div>
                </div>
                <div className="flex flex-col">
                   <span className="font-semibold tracking-tight text-navy-900 text-base leading-none">myCORE</span>
                </div>
              </div>
              
              {/* Desktop Nav - iOS Segmented Control Style */}
              <nav className="hidden md:flex bg-slate-100/80 p-1 rounded-full backdrop-blur-md">
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
                    className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 flex items-center gap-2 ${
                      activeTab === tab.id 
                        ? 'bg-white text-navy-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-black/5'
                    }`}
                  >
                    <tab.icon size={14} className={activeTab === tab.id ? 'stroke-[2.5px]' : 'stroke-2'} />
                    {tab.label}
                  </button>
                ))}
              </nav>

              <button 
                onClick={() => setActiveTab('settings')} 
                className="md:hidden p-2 text-navy-900 rounded-full hover:bg-black/5 transition-colors"
              >
                  <Settings size={22} strokeWidth={1.5} />
              </button>
            </div>
          </header>

          {/* MAIN CONTENT */}
          <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 pb-32 md:pb-12">
            <div className="animate-scale-in origin-top">
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'tasks' && <TasksPage />}
              {activeTab === 'interests' && <Interests />}
              {activeTab === 'analytics' && <Analytics />}
              {activeTab === 'settings' && <SettingsPage />}
            </div>
          </main>

          {/* MOBILE NAV - Glassmorphism */}
          <div className="md:hidden fixed bottom-6 inset-x-4 h-16 bg-white/80 backdrop-blur-2xl border border-white/20 rounded-[2rem] shadow-apple z-50 flex justify-between items-center px-6">
             {[
               { id: 'dashboard', icon: LayoutDashboard },
               { id: 'tasks', icon: CheckSquare },
               { id: 'interests', icon: Compass },
               { id: 'analytics', icon: BarChart2 },
             ].map(tab => (
               <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-3 rounded-full transition-all duration-300 ${
                    activeTab === tab.id 
                    ? 'bg-navy-900 text-white shadow-glow translate-y-[-4px]' 
                    : 'text-slate-400'
                  }`}
               >
                  <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
               </button>
             ))}
          </div>

          {/* FOOTER */}
          <footer className="hidden md:block py-8 text-center mt-auto">
            <div className="flex items-center justify-center gap-2 mb-2 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
               <img src="/logo.png" alt="GNG" className="h-5 w-auto" />
               <span className="font-semibold text-navy-900 text-xs tracking-wide">Growth Nexis Global</span>
            </div>
            <p className="text-navy-900/40 text-[10px] tracking-wide font-medium">
              “Unlocking Limitless Potential.”
            </p>
          </footer>
        </div>
      )}
    </AppContext.Provider>
  );
}