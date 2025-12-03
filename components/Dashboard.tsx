import React, { useState } from 'react';
import { useApp } from '../App';
import { getWeekDays, formatDate, getDayName, calculateCompletion } from '../utils';
import { HabitInstance, TriggerType } from '../types';
import * as Icons from 'lucide-react';
import HabitTriggerModal from './HabitTriggerModal';
import { CheckSquare, ArrowRight, Plus, MapPin, Smartphone, Zap } from 'lucide-react';
import AddTaskModal from './AddTaskModal';

// --- SUB-COMPONENTS ---

const ProgressRing = ({ percent, size = 60, stroke = 4, color = "currentColor" }: { percent: number; size?: number; stroke?: number, color?: string }) => {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          className="text-white/20"
          strokeWidth={stroke}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="transition-all duration-1000 ease-out"
          style={{ color }}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute text-[10px] font-bold" style={{ color }}>{percent}%</span>
    </div>
  );
};

const DayCard = ({ date, instances, habits, isSelected, onClick }: any) => {
  const dayName = getDayName(new Date(date));
  const dayNum = new Date(date).getDate();
  const completedCount = instances.filter((i: any) => i.completed).length;
  const total = instances.length;
  const percent = calculateCompletion(total, completedCount);
  const isToday = formatDate(new Date()) === date;

  return (
    <button 
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-between p-3 rounded-[20px] min-w-[72px] h-[110px] transition-all duration-300
        ${isSelected 
          ? 'bg-black text-white shadow-lg scale-105 z-10' 
          : 'bg-white text-gray-400 hover:bg-white/80'
        }
      `}
    >
      <div className="text-center mt-1">
        <div className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>{dayName}</div>
        <div className={`text-lg font-semibold leading-tight ${isSelected ? 'text-white' : 'text-gray-900'}`}>{dayNum}</div>
      </div>

      <div className="mb-1">
          {/* Mini Ring for Selected, Dot for Unselected */}
          {isSelected ? (
              <ProgressRing percent={percent} size={32} stroke={3} color="#fff" />
          ) : (
             <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-blue-500' : 'bg-gray-200'}`} />
          )}
      </div>
    </button>
  );
};

const HabitRow = ({ habit, instance, onTrigger }: any) => {
  // Dynamic Icon
  const IconComponent = (Icons as any)[habit.icon] || Icons.Circle;
  const isCompleted = instance?.completed;
  
  // Trigger Logic Text
  const getTriggerText = () => {
    switch (habit.triggerType) {
      case TriggerType.LOCATION: return `Arrive at ${habit.triggerConfig?.locationName}`;
      case TriggerType.APP_OPEN: return `Open ${habit.triggerConfig?.appName}`;
      case TriggerType.SCREEN_TIME: return `Usage < ${habit.triggerConfig?.thresholdMinutes}m`;
      default: return 'Manual Check';
    }
  };

  return (
    <div className={`group flex items-center justify-between p-4 mb-3 rounded-2xl transition-all duration-500 ease-out
      ${isCompleted 
        ? 'bg-gray-50/50' 
        : 'bg-white shadow-apple hover:shadow-apple-hover hover:scale-[1.01]'
      }
    `}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isCompleted ? 'bg-green-100 text-green-600 scale-90' : 'bg-gray-50 text-gray-600 group-hover:bg-black group-hover:text-white'}`}>
          <IconComponent size={20} strokeWidth={2} />
        </div>
        <div className="flex-1">
          <h4 className={`font-semibold text-sm transition-all duration-500 ${isCompleted ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-900'}`}>{habit.name}</h4>
          <div className="flex items-center gap-1.5 mt-0.5 transition-opacity duration-500">
             {habit.triggerType !== TriggerType.MANUAL && (
                <div className={`p-0.5 rounded-md ${isCompleted ? 'bg-gray-200 text-gray-500' : 'bg-blue-50 text-blue-600'}`}>
                    {habit.triggerType === TriggerType.LOCATION && <MapPin size={10} />}
                    {habit.triggerType === TriggerType.APP_OPEN && <Zap size={10} />}
                    {habit.triggerType === TriggerType.SCREEN_TIME && <Smartphone size={10} />}
                </div>
             )}
            <span className={`text-[11px] font-medium ${isCompleted ? 'text-gray-300' : 'text-gray-500'}`}>{getTriggerText()}</span>
          </div>
        </div>
      </div>

      <button 
        onClick={() => onTrigger(instance)}
        disabled={isCompleted}
        className={`h-9 px-4 rounded-full text-xs font-semibold transition-all duration-300
          ${isCompleted 
            ? 'bg-transparent text-green-600 cursor-default pl-6' 
            : 'bg-black text-white hover:bg-gray-800 shadow-lg shadow-black/10 active:scale-95'}
        `}
      >
        {isCompleted ? (
           <span className="flex items-center gap-1">
             Done <Icons.Check size={14} />
           </span>
        ) : (
           habit.triggerType === TriggerType.MANUAL ? 'Complete' : 'Simulate'
        )}
      </button>
    </div>
  );
};

// --- MAIN DASHBOARD ---

export default function Dashboard() {
  const { habits, currentWeekInstances, handleTrigger, user, tasks, setActiveTab } = useApp();
  const weekDays = getWeekDays();
  const today = formatDate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [triggerModal, setTriggerModal] = useState<{ isOpen: boolean, instance: HabitInstance | null, habit: any | null }>({ isOpen: false, instance: null, habit: null });
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Compute Weekly Stats
  const weekInstances = Object.values(currentWeekInstances).flat() as HabitInstance[];
  const weekCompletion = calculateCompletion(weekInstances.length, weekInstances.filter(i => i.completed).length);
  
  // Data for selected day
  const dayInstances = currentWeekInstances[selectedDate] || [];

  // Tasks Due Today
  const tasksDue = tasks.filter(t => t.dueDate === today && !t.completed);

  const openTrigger = (instance: HabitInstance) => {
    const habit = habits.find(h => h.id === instance.habitId);
    if (!habit) return;
    
    // If it's manual, just toggle immediately for UX speed, otherwise show simulation modal
    if (habit.triggerType === TriggerType.MANUAL) {
      handleTrigger(instance.id);
    } else {
      setTriggerModal({ isOpen: true, instance, habit });
    }
  };

  const handleSimulationConfirm = async (val?: number) => {
    if (triggerModal.instance) {
      await handleTrigger(triggerModal.instance.id, val);
    }
    setTriggerModal({ isOpen: false, instance: null, habit: null });
  };

  return (
    <div className="space-y-8 animate-slide-up">
      
      {/* 1. HERO HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] text-white rounded-[32px] p-8 relative overflow-hidden shadow-apple-hover">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] translate-x-1/2 -translate-y-1/2" />
           
           <div className="relative z-10 flex items-center justify-between h-full">
             <div className="flex flex-col justify-between h-full space-y-6">
               <div>
                 <h2 className="text-3xl font-bold tracking-tight">Good {new Date().getHours() < 12 ? 'Morning' : 'Evening'}, {user?.name.split(' ')[0]}</h2>
                 <p className="text-gray-400 font-medium text-sm mt-1">Your core balance is at {weekCompletion}% this week.</p>
               </div>
               
               <div className="flex gap-6">
                 <div>
                   <span className="block text-2xl font-bold">{habits.length}</span>
                   <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Habits</span>
                 </div>
                 <div>
                    <span className="block text-2xl font-bold text-blue-400">
                      {habits.reduce((acc, h) => acc + h.streak, 0)}
                    </span>
                   <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Streak</span>
                 </div>
               </div>
             </div>
             
             {/* Weekly Ring Chart */}
             <div className="hidden sm:block">
                <ProgressRing percent={weekCompletion} size={110} stroke={8} color="#fff" />
             </div>
           </div>
        </div>
        
        {/* TASKS WIDGET */}
        <div 
          onClick={() => setActiveTab('tasks')}
          className="bg-white rounded-[32px] p-8 shadow-apple cursor-pointer group hover:shadow-apple-hover transition-all relative flex flex-col justify-between"
        >
           <div className="absolute top-6 right-6 z-20">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTaskModal(true);
                }}
                className="w-10 h-10 bg-gray-100 hover:bg-black hover:text-white rounded-full flex items-center justify-center transition-all text-gray-600"
              >
                <Plus size={20} />
              </button>
           </div>

           <div className="w-12 h-12 bg-gray-50 text-gray-900 rounded-2xl flex items-center justify-center mb-4">
              <CheckSquare size={24} />
           </div>
           
           <div>
              <div className="flex items-baseline gap-1">
                 <div className="text-4xl font-bold text-gray-900">{tasksDue.length}</div>
                 {tasksDue.length > 0 && <div className="w-2 h-2 rounded-full bg-red-500" />}
              </div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Due Today</p>
           </div>
        </div>
      </div>

      {/* 2. WEEKLY CALENDAR SCROLL */}
      <div>
        <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-lg font-bold text-gray-900">This Week</h3>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {new Date().toLocaleString('default', { month: 'long' })}
            </span>
        </div>
        <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar snap-x snap-mandatory">
            {weekDays.map((d, i) => {
                const dStr = formatDate(d);
                return (
                    <div key={i} className="snap-center">
                        <DayCard 
                            date={dStr}
                            instances={currentWeekInstances[dStr] || []}
                            habits={habits}
                            isSelected={selectedDate === dStr}
                            onClick={() => setSelectedDate(dStr)}
                        />
                    </div>
                )
            })}
        </div>
      </div>

      {/* 3. HABIT LIST */}
      <div>
        <div className="flex items-center justify-between mb-4 px-2 mt-6">
             <h3 className="text-xl font-bold text-gray-900">
                {formatDate(new Date()) === selectedDate ? "Today's Core" : `${getDayName(new Date(selectedDate))}'s Core`}
            </h3>
            <p className="text-gray-400 text-sm font-medium">
                {dayInstances.filter(i => i.completed).length}/{dayInstances.length} Done
            </p>
        </div>

        <div className="space-y-1">
            {dayInstances.length > 0 ? (
                dayInstances.map(inst => {
                    const h = habits.find(hab => hab.id === inst.habitId);
                    if (!h) return null;
                    return (
                        <HabitRow 
                            key={inst.id} 
                            habit={h} 
                            instance={inst} 
                            onTrigger={openTrigger} 
                        />
                    );
                })
            ) : (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                    <p className="text-gray-400 text-sm">No habits scheduled for this day.</p>
                </div>
            )}
        </div>
      </div>

      {/* MODALS */}
      {triggerModal.isOpen && triggerModal.habit && (
        <HabitTriggerModal 
            habit={triggerModal.habit}
            onClose={() => setTriggerModal({ isOpen: false, instance: null, habit: null })}
            onConfirm={handleSimulationConfirm}
        />
      )}

      {showTaskModal && (
        <AddTaskModal onClose={() => setShowTaskModal(false)} />
      )}

    </div>
  );
}