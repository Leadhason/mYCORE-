
import React, { useState } from 'react';
import { useApp } from '../App.tsx';
import { getWeekDays, formatDate, getDayName, calculateCompletion } from '../../utils.ts';
import { HabitInstance, TriggerType } from '../../types.ts';
import * as Icons from 'lucide-react';
import HabitTriggerModal from './HabitTriggerModal';
import { CheckSquare, ArrowRight, Plus, Calendar } from 'lucide-react';
import AddTaskModal from './AddTaskModal';

// --- SUB-COMPONENTS ---

const ProgressRing = ({ percent, size = 60, stroke = 4 }: { percent: number; size?: number; stroke?: number }) => {
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
          className="text-white transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
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
    </div>
  );
};

// Apple-style Calendar Day Strip
const DayCard = ({ date, instances, habits, isSelected, onClick }: any) => {
  const dayName = getDayName(new Date(date)).charAt(0); // M, T, W
  const dayNum = new Date(date).getDate();
  const completedCount = instances.filter((i: any) => i.completed).length;
  const total = instances.length;
  const hasItems = total > 0;
  const allDone = hasItems && completedCount === total;
  const isToday = formatDate(new Date()) === date;

  return (
    <button 
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-1 w-[3.5rem] h-[4.5rem] rounded-[1.2rem] transition-all duration-300
        ${isSelected 
            ? 'bg-navy-900 text-white shadow-lg shadow-navy-900/30 scale-105' 
            : 'bg-white text-slate-400 hover:bg-white/80'
        }
      `}
    >
      <span className={`text-[10px] font-semibold uppercase ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
        {dayName}
      </span>
      <span className={`text-lg font-bold leading-none ${isSelected ? 'text-white' : 'text-slate-800'}`}>
        {dayNum}
      </span>
      
      {/* Dot Indicator */}
      <div className={`mt-1 w-1.5 h-1.5 rounded-full transition-colors ${
        isSelected 
            ? 'bg-white' 
            : isToday 
                ? 'bg-blue-500' 
                : allDone 
                    ? 'bg-green-400' 
                    : 'bg-transparent'
      }`} />
    </button>
  );
};

const HabitRow = ({ habit, instance, onTrigger }: any) => {
  const IconComponent = (Icons as any)[habit.icon] || Icons.Circle;
  const isCompleted = instance?.completed;
  
  const getTriggerText = () => {
    switch (habit.triggerType) {
      case TriggerType.LOCATION: return `Arrive at ${habit.triggerConfig?.locationName}`;
      case TriggerType.APP_OPEN: return `Open ${habit.triggerConfig?.appName}`;
      case TriggerType.SCREEN_TIME: return `Usage < ${habit.triggerConfig?.thresholdMinutes}m`;
      default: return 'Manual Check';
    }
  };

  return (
    <div 
      className={`
        group flex items-center justify-between p-4 mb-3 rounded-[1.25rem] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] border
        ${isCompleted 
            ? 'bg-white/40 border-slate-200/50 opacity-80 backdrop-blur-sm' 
            : 'bg-white border-white shadow-soft hover:shadow-lg hover:scale-[1.01] hover:border-navy-50'
        }
      `}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`
          w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 transition-all duration-500
          ${isCompleted 
            ? 'bg-green-400 text-white scale-105 rotate-[-3deg] shadow-inner animate-scale-in' 
            : 'bg-ios-input text-navy-900 group-hover:bg-navy-900 group-hover:text-white'
          }
        `}>
          <IconComponent size={20} strokeWidth={isCompleted ? 3 : 2} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={`text-[15px] font-semibold tracking-tight transition-colors truncate ${isCompleted ? 'text-slate-400 line-through' : 'text-navy-900'}`}>
            {habit.name}
          </h4>
          <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-slate-400 bg-slate-100 shrink-0`}>
              {habit.triggerType === TriggerType.MANUAL ? 'Manual' : 'Auto'}
            </span>
            
            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${habit.streak > 0 ? 'text-orange-500 bg-orange-50' : 'text-slate-300 bg-slate-50'}`}>
                <Icons.Flame size={10} fill={habit.streak > 0 ? "currentColor" : "none"} /> 
                {habit.streak} Day{habit.streak !== 1 ? 's' : ''}
            </span>

            <span className="text-xs text-slate-400 font-medium truncate">{getTriggerText()}</span>
          </div>
        </div>
      </div>

      <button 
        onClick={() => onTrigger(instance)}
        disabled={isCompleted}
        className={`
          relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 shrink-0 ml-2
          ${isCompleted 
            ? 'bg-transparent text-green-500 scale-110' 
            : 'bg-ios-input text-slate-400 hover:bg-navy-900 hover:text-white hover:shadow-md'
          }
        `}
      >
        {isCompleted ? <Icons.CheckCircle2 size={24} fill="currentColor" className="text-white animate-scale-in" stroke="rgb(34, 197, 94)" /> : <div className="w-5 h-5 rounded-full border-[2.5px] border-current opacity-60" />}
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

  // Stats
  const weekInstances = Object.values(currentWeekInstances).flat() as HabitInstance[];
  const weekCompletion = calculateCompletion(weekInstances.length, weekInstances.filter(i => i.completed).length);
  const dayInstances = currentWeekInstances[selectedDate] || [];
  const tasksDue = tasks.filter(t => t.dueDate === today && !t.completed);

  const openTrigger = (instance: HabitInstance) => {
    const habit = habits.find(h => h.id === instance.habitId);
    if (!habit) return;
    
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
    <div className="space-y-8 pb-10">
      
      {/* 1. GREETING & STATS CARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 relative overflow-hidden rounded-[2rem] bg-navy-900 text-white shadow-apple p-8 flex flex-col justify-between min-h-[220px]">
           {/* Ambient Background Mesh */}
           <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur-[80px] opacity-30 translate-x-1/3 -translate-y-1/3" />
           <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-indigo-500 rounded-full blur-[60px] opacity-20 -translate-x-1/3 translate-y-1/3" />
           
           <div className="relative z-10">
             <h2 className="text-3xl font-bold tracking-tight">Good {new Date().getHours() < 12 ? 'Morning' : 'Evening'}, <br/> {user?.name.split(' ')[0]}</h2>
             <p className="text-white/70 font-medium mt-2 text-sm tracking-wide">Ready to unlock your potential today?</p>
           </div>

           <div className="relative z-10 flex items-end justify-between mt-6">
             <div className="flex gap-4">
                 <div className="backdrop-blur-md bg-white/10 border border-white/10 px-4 py-2 rounded-2xl">
                    <span className="block text-2xl font-bold">{weekCompletion}%</span>
                    <span className="text-[10px] uppercase font-bold text-white/60">Weekly Core</span>
                 </div>
                 <div className="backdrop-blur-md bg-white/10 border border-white/10 px-4 py-2 rounded-2xl">
                    <span className="block text-2xl font-bold">{habits.reduce((acc, h) => acc + h.streak, 0)}</span>
                    <span className="text-[10px] uppercase font-bold text-white/60">Total Streak</span>
                 </div>
             </div>
             
             {/* Ring Chart */}
             <div className="hidden sm:block">
                <ProgressRing percent={weekCompletion} size={80} stroke={5} />
             </div>
           </div>
        </div>
        
        {/* TASKS WIDGET */}
        <div 
          onClick={() => setActiveTab('tasks')}
          className="bg-white rounded-[2rem] p-6 shadow-apple flex flex-col justify-between cursor-pointer group hover:scale-[1.02] transition-transform duration-300 relative border border-white"
        >
           <button 
                onClick={(e) => { e.stopPropagation(); setShowTaskModal(true); }}
                className="absolute top-5 right-5 w-8 h-8 bg-ios-input hover:bg-navy-900 hover:text-white rounded-full flex items-center justify-center transition-all text-slate-500"
           >
                <Plus size={18} />
           </button>

           <div className="w-12 h-12 bg-ios-input text-navy-900 rounded-[1rem] flex items-center justify-center group-hover:bg-navy-900 group-hover:text-white transition-colors duration-500">
                <CheckSquare size={24} />
           </div>

           <div className="mt-4">
              <div className="flex items-baseline gap-1">
                 <span className="text-3xl font-bold text-navy-900 tracking-tight">{tasksDue.length}</span>
                 <span className="text-sm text-slate-400 font-medium">due today</span>
              </div>
              <p className="text-sm font-semibold text-slate-800 mt-1">Tasks & Projects</p>
           </div>
        </div>
      </div>

      {/* 2. CALENDAR STRIP */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-bold text-lg text-navy-900 tracking-tight">Your Week</h3>
            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium bg-white px-3 py-1 rounded-full shadow-sm">
                <Calendar size={14} />
                {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </div>
        </div>
        <div className="flex justify-between items-center bg-white/50 backdrop-blur-xl p-2 rounded-[1.5rem] overflow-x-auto no-scrollbar shadow-inner-light">
            {weekDays.map((d: Date, i: number) => (
                <DayCard 
                    key={i}
                    date={formatDate(d)}
                    instances={currentWeekInstances[formatDate(d)] || []}
                    habits={habits}
                    isSelected={selectedDate === formatDate(d)}
                    onClick={() => setSelectedDate(formatDate(d))}
                />
            ))}
        </div>
      </div>

      {/* 3. HABIT LIST */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1 mt-6">
             <h3 className="font-bold text-lg text-navy-900 tracking-tight">
                {formatDate(new Date()) === selectedDate ? "Today's Routine" : `${getDayName(new Date(selectedDate))}'s Routine`}
            </h3>
        </div>
        
        <div className="space-y-3">
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
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-[2rem] shadow-apple border border-white">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                        <Icons.Coffee size={32} />
                    </div>
                    <p className="text-slate-400 font-medium">No habits scheduled for this day.</p>
                    <p className="text-slate-300 text-sm">Enjoy your rest!</p>
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
