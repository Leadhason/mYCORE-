import { Habit, HabitInstance, TriggerType } from '../../types.ts';

export const NotificationService = {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return false;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  send(title: string, body: string) {
    if (Notification.permission === 'granted') {
      // Use a standard system notification
      try {
        new Notification(title, {
          body,
          icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', // Generic placeholder icon
          silent: false,
        });
      } catch (e) {
        console.error("Notification failed", e);
      }
    }
  },

  sendReminderForHabits(habits: Habit[], instances: HabitInstance[]) {
    if (Notification.permission !== 'granted') return;

    // Filter incomplete manual habits
    const incomplete = instances.filter(i => {
      const habit = habits.find(h => h.id === i.habitId);
      return !i.completed && habit?.triggerType === TriggerType.MANUAL;
    });

    if (incomplete.length > 0) {
      this.send(
        'Stay on Track',
        `You have ${incomplete.length} pending habits to complete your Core today.`
      );
    }
  },

  sendStreakCongratulation(habitName: string, streak: number) {
    if (Notification.permission !== 'granted') return;
    this.send(
      '🔥 Amazing Streak!',
      `You've maintained a ${streak}-day streak on ${habitName}! Keep the momentum going.`
    );
  },

  sendCompletionCongratulation() {
    if (Notification.permission !== 'granted') return;
    this.send(
      '🌟 Day Complete!',
      `You've finished your entire Core routine for today. Great work!`
    );
  }
};
