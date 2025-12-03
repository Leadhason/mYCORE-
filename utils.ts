import { Habit, HabitInstance } from './types';

export const getWeekDays = (startDate: Date = new Date()) => {
  const days = [];
  // Adjust to get Monday as start if needed, currently getting current week surrounding today
  // For simplicity in this view, let's show last 3 days, today, next 3 days
  const current = new Date(startDate);
  current.setDate(current.getDate() - 3);

  for (let i = 0; i < 7; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getDayName = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

export const calculateCompletion = (total: number, completed: number) => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

export const calculateHabitStrength = (habit: Habit, instances: HabitInstance[]): number => {
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
  
  // Update the habit object passed by reference (or return the value to be assigned)
  // We return the score, but we can also set the streak on the object if needed by the caller.
  // The caller is responsible for assigning streak to the habit object if they want to persist it/display it.
  
  const totalCompleted = sorted.filter(i => i.completed).length;
  const totalInstances = sorted.length;
  
  if (totalInstances === 0) return 0;

  const completionRate = (totalCompleted / totalInstances) * 100;
  // We weight the streak contribution (capped at 21 days for max momentum bonus)
  const streakBonus = (Math.min(currentStreak, 21) / 21) * 100;

  // Final score: 70% based on consistency (completion rate), 30% based on current momentum (streak)
  return Math.round((completionRate * 0.7) + (streakBonus * 0.3));
};

export const getHabitStreak = (instances: HabitInstance[]): number => {
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
    return currentStreak;
};