import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, getDoc, setDoc, 
  updateDoc, query, where, getDocs, writeBatch,
  addDoc, deleteDoc
} from 'firebase/firestore';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged, User as FirebaseUser 
} from 'firebase/auth';
import { Habit, HabitInstance, InterestType, TriggerType, User, ScheduleType, Task, Project } from '../types';
import { formatDate, getHabitStreak } from '../utils';

// !!! REPLACE WITH YOUR FIREBASE CONFIGURATION !!!
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:12345:web:abcde"
};

// Initialize
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

// Collection Refs
const USERS_COL = 'users';
const HABITS_COL = 'habits';
const INSTANCES_COL = 'instances';
const TASKS_COL = 'tasks';
const PROJECTS_COL = 'projects';

// --- SERVICE CLASS ---

class FirebaseService {
  private currentUser: User | null = null;

  // USER
  async getUser(): Promise<User | null> {
    const fbUser = auth.currentUser;
    if (!fbUser) return null;
    
    if (this.currentUser) return this.currentUser;

    const docRef = doc(firestore, USERS_COL, fbUser.uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      this.currentUser = snap.data() as User;
      return this.currentUser;
    }
    return null;
  }

  async initUser(email: string, name: string): Promise<User> {
    const fbUser = auth.currentUser;
    if (!fbUser) throw new Error("No authenticated user");

    const docRef = doc(firestore, USERS_COL, fbUser.uid);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
      this.currentUser = snap.data() as User;
      return this.currentUser;
    }

    // Create new profile
    const newUser: User = {
      id: fbUser.uid,
      email,
      name,
      onboarded: false,
      interests: [],
      settings: { locationEnabled: false, notificationsEnabled: false, screenTimeEnabled: false }
    };

    await setDoc(docRef, newUser);
    this.currentUser = newUser;
    return newUser;
  }

  async completeOnboarding(
    userId: string, 
    interests: InterestType[], 
    habits: Habit[], 
    permissions: { loc: boolean; notif: boolean; screen: boolean }
  ): Promise<void> {
    const userRef = doc(firestore, USERS_COL, userId);
    
    // 1. Update User
    await updateDoc(userRef, {
      interests,
      onboarded: true,
      settings: {
        locationEnabled: permissions.loc,
        notificationsEnabled: permissions.notif,
        screenTimeEnabled: permissions.screen
      }
    });

    // 2. Create Habits Subcollection
    const batch = writeBatch(firestore);
    habits.forEach(h => {
        const hRef = doc(collection(firestore, USERS_COL, userId, HABITS_COL)); // auto-id
        batch.set(hRef, { ...h, id: hRef.id }); // Ensure ID matches doc ID
    });
    
    // 3. Seed Instances (Basic)
    // In a real app, a Cloud Function usually generates these daily.
    // We will client-side seed just for the demo start.
    const today = new Date();
    const dates = [];
    for(let i=0; i<7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        dates.push(formatDate(d));
    }

    // We can't batch too many, so let's just create habits first.
    await batch.commit();
    
    // We will let getWeekInstances handle lazy creation of instances to avoid write limits
  }

  async updateUserSettings(settings: User['settings']): Promise<void> {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    const userRef = doc(firestore, USERS_COL, fbUser.uid);
    await updateDoc(userRef, { settings });
    if (this.currentUser) this.currentUser.settings = settings;
  }

  // HABITS
  async getHabits(): Promise<Habit[]> {
    const fbUser = auth.currentUser;
    if (!fbUser) return [];

    const habitsRef = collection(firestore, USERS_COL, fbUser.uid, HABITS_COL);
    const snap = await getDocs(habitsRef);
    const habits = snap.docs.map(d => d.data() as Habit);
    
    // Calculate Streaks dynamically
    // In a real optimized app, streak might be stored on the Habit document and updated via cloud function
    // For this client-side integration, we'll fetch all instances (expensive) or just trust the local state?
    // Let's do a simple query for past instances
    const instancesRef = collection(firestore, USERS_COL, fbUser.uid, INSTANCES_COL);
    const instSnap = await getDocs(instancesRef);
    const allInstances = instSnap.docs.map(d => d.data() as HabitInstance);

    habits.forEach(h => {
        const habitInstances = allInstances.filter(i => i.habitId === h.id);
        h.streak = getHabitStreak(habitInstances);
    });

    return habits;
  }

  async getSuggestions(interests: InterestType[]): Promise<Habit[]> {
    // This logic remains client-side or moves to a dedicated collection "templates"
    // For now, we return empty or hardcode common ones, as this is mostly UI logic
    return []; 
  }

  // INSTANCES
  async getInstancesForDate(dateStr: string): Promise<HabitInstance[]> {
    // This is called by getWeekInstances, simplified here
    return [];
  }

  async getWeekInstances(dates: string[]): Promise<HabitInstance[]> {
    const fbUser = auth.currentUser;
    if (!fbUser) return [];

    const instancesRef = collection(firestore, USERS_COL, fbUser.uid, INSTANCES_COL);
    const q = query(instancesRef, where('date', 'in', dates)); // 'in' limits to 10
    const snap = await getDocs(q);
    let instances = snap.docs.map(d => d.data() as HabitInstance);

    // Lazy create missing
    const habits = await this.getHabits();
    const missing: HabitInstance[] = [];
    
    for (const date of dates) {
        const dayOfWeek = new Date(date).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const scheduledHabits = habits.filter(h => {
            if (h.schedule === ScheduleType.DAILY) return true;
            if (h.schedule === ScheduleType.WEEKDAYS) return !isWeekend;
            if (h.schedule === ScheduleType.WEEKENDS) return isWeekend;
            return true; // Custom not handled fully
        });

        scheduledHabits.forEach(h => {
            if (!instances.find(i => i.date === date && i.habitId === h.id)) {
                const newInst: HabitInstance = {
                    id: `${date}_${h.id}`,
                    habitId: h.id,
                    date: date,
                    completed: false
                };
                missing.push(newInst);
                instances.push(newInst);
            }
        });
    }

    if (missing.length > 0) {
        const batch = writeBatch(firestore);
        missing.forEach(i => {
            const ref = doc(firestore, USERS_COL, fbUser.uid, INSTANCES_COL, i.id);
            batch.set(ref, i);
        });
        await batch.commit();
    }

    return instances;
  }

  async updateInstanceStatus(instanceId: string, completed: boolean, value?: number): Promise<void> {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    
    const ref = doc(firestore, USERS_COL, fbUser.uid, INSTANCES_COL, instanceId);
    const updateData: any = { completed };
    if (completed) updateData.completedAt = new Date().toISOString();
    if (value !== undefined) updateData.value = value;
    
    await updateDoc(ref, updateData);
  }

  // --- TASKS & PROJECTS ---

  async getTasks(): Promise<Task[]> {
    const fbUser = auth.currentUser;
    if (!fbUser) return [];
    const snap = await getDocs(collection(firestore, USERS_COL, fbUser.uid, TASKS_COL));
    return snap.docs.map(d => d.data() as Task);
  }

  async addTask(task: Task): Promise<void> {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    await setDoc(doc(firestore, USERS_COL, fbUser.uid, TASKS_COL, task.id), task);
    if (task.projectId) this.updateProjectProgress(task.projectId);
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    
    await updateDoc(doc(firestore, USERS_COL, fbUser.uid, TASKS_COL, taskId), updates);
    
    // We need to fetch the task to know its projectId if not in updates
    // For simplicity, assuming the caller refreshes or we do a smart update
    // Just trigger project calc if completed changed
    if (updates.completed !== undefined) {
       // Ideally we need to know the project ID. 
       // In a real app, we'd read the doc first or pass projectId.
       const tSnap = await getDoc(doc(firestore, USERS_COL, fbUser.uid, TASKS_COL, taskId));
       const tData = tSnap.data() as Task;
       if (tData.projectId) await this.updateProjectProgress(tData.projectId);
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    const tRef = doc(firestore, USERS_COL, fbUser.uid, TASKS_COL, taskId);
    const snap = await getDoc(tRef);
    const task = snap.data() as Task;
    
    await deleteDoc(tRef);
    if (task?.projectId) await this.updateProjectProgress(task.projectId);
  }

  async getProjects(): Promise<Project[]> {
    const fbUser = auth.currentUser;
    if (!fbUser) return [];
    const snap = await getDocs(collection(firestore, USERS_COL, fbUser.uid, PROJECTS_COL));
    return snap.docs.map(d => d.data() as Project);
  }

  async addProject(project: Project): Promise<void> {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    await setDoc(doc(firestore, USERS_COL, fbUser.uid, PROJECTS_COL, project.id), project);
  }

  private async updateProjectProgress(projectId: string): Promise<void> {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    
    // Fetch all tasks for this project
    const tasksRef = collection(firestore, USERS_COL, fbUser.uid, TASKS_COL);
    const q = query(tasksRef, where('projectId', '==', projectId));
    const snap = await getDocs(q);
    
    const total = snap.size;
    const completed = snap.docs.filter(d => (d.data() as Task).completed).length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    const status = progress === 100 ? 'completed' : 'active';
    
    await updateDoc(doc(firestore, USERS_COL, fbUser.uid, PROJECTS_COL, projectId), {
        progress,
        status: status === 'completed' ? 'completed' : 'active' // simple logic
    });
  }

  async reset() {
      await signOut(auth);
  }
}

export const db = new FirebaseService();