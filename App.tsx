import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, Habit, HabitInstance, InterestType, Task, Project } from './types';
import { db } from './services/supabaseService'; // Using Supabase
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
    const initAuth = async () => {
        const authUser = await AuthService.checkSession();
        if (authUser) {
            setIsAuthenticated(true);
            loadUserProfile(authUser.email);
        } else {
            setIsLoading(false);
        }
    }
    initAuth();
  }, []);

  const loadUserProfile = async (email: string, name: string = 'User') => {
    setIsLoading(true);
    // For Supabase, initUser will either create or fetch existing profile linked to Auth ID
    const u = await db.initUser(email, name);
    setUser(u);
    if (u && u.onboarded) {
       await refreshData();
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
        if (grouped[i.date]) grouped[i.date].push(i);
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
    const currentList = currentWeekInstances[dateStr] || [];
    const target = currentList.find(i => i.id === instanceId);
    
    if (target) {
        const newState = !target.completed;
        const newInstances = { ...currentWeekInstances };
        newInstances[dateStr] = currentList.map(i => 
            i.id === instanceId ? { ...i, completed: newState } : i
        );
        setCurrentWeekInstances(newInstances);

        if (newState && user?.settings.notificationsEnabled) {
            const habit = habits.find(h => h.id === target.habitId);
            if (habit && habit.streak >= 3) {
                 if (Math.random() > 0.7) NotificationService.sendStreakCongratulation(habit.name, habit.streak);
            }
            const allDone = newInstances[dateStr].every(i => i.completed);
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
      <div className="h-screen w-full flex items-center justify-center bg-[#F5F5F7]">
        <Loader2 className="w-10 h-10 animate-spin text-ios-text opacity-50" />
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
        <div className="min-h-screen flex flex-col bg-ios-bg text-ios-text font-sans selection:bg-ios-blue selection:text-white">
          
          {/* HEADER (Glass) */}
          <header className="fixed top-0 inset-x-0 z-40 glass h-14 transition-all duration-300">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setActiveTab('dashboard')}>
                <img 
                  src="/logo.png" 
                  alt="Growth Nexis Global" 
                  className="w-8 h-8 object-contain transition-transform group-hover:scale-105" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-xs">
                  GN
                </div>
                <div className="flex flex-col justify-center">
                   <span className="font-semibold tracking-tight text-ios-text text-sm leading-none">myCORE</span>
                </div>
              </div>
              
              <nav className="hidden md:flex gap-1">
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
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${
                      activeTab === tab.id 
                        ? 'bg-black text-white shadow-sm' 
                        : 'text-ios-subtext hover:text-ios-text hover:bg-white/50'
                    }`}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </nav>

              <button onClick={() => setActiveTab('settings')} className="md:hidden p-2 text-ios-text">
                  <Settings size={20} />
              </button>
            </div>
          </header>

          {/* Spacer for fixed header */}
          <div className="h-14" />

          {/* MAIN CONTENT */}
          <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 pb-32 md:pb-12 animate-fade-in">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'tasks' && <TasksPage />}
            {activeTab === 'interests' && <Interests />}
            {activeTab === 'analytics' && <Analytics />}
            {activeTab === 'settings' && <SettingsPage />}
          </main>

          {/* MOBILE NAV (Floating Dock) */}
          <div className="md:hidden fixed bottom-6 inset-x-6 z-40">
            <div className="glass rounded-full shadow-apple-hover p-2 flex justify-between items-center bg-white/80">
               {[
                 { id: 'dashboard', icon: LayoutDashboard },
                 { id: 'tasks', icon: CheckSquare },
                 { id: 'interests', icon: Compass },
                 { id: 'analytics', icon: BarChart2 },
               ].map(tab => (
                 <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`p-3 rounded-full transition-all duration-300 relative ${
                      activeTab === tab.id 
                        ? 'text-white bg-black shadow-md scale-105' 
                        : 'text-ios-subtext hover:bg-gray-100'
                    }`}
                 >
                    <tab.icon size={20} strokeWidth={2} />
                 </button>
               ))}
            </div>
          </div>

          {/* FOOTER */}
          <footer className="hidden md:block py-8 text-center mt-auto">
            <div className="flex items-center justify-center gap-2 mb-2 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
               <img src="/logo.png" alt="GNG" className="h-5 w-auto" />
               <span className="font-semibold text-ios-text text-xs">Growth Nexis Global</span>
            </div>
            <p className="text-ios-subtext text-[10px] font-medium tracking-wide">
              Unlocking Limitless Potential. Delivering Global Impact.
            </p>
          </footer>
        </div>
      )}
    </AppContext.Provider>
  );
}