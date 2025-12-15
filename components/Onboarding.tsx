
import React, { useState, useEffect } from 'react';
import { InterestType, Habit, TriggerType, ScheduleType } from '../types';
import { useApp } from '../App';
import { db } from '../services/mockDb';
import { 
  Activity, BookOpen, DollarSign, Brain, Smartphone, 
  Check, ArrowRight, ShieldCheck, MapPin, Bell, Plus, X,
  Dumbbell, Droplets, Moon, Sun, Monitor, Coffee, Music, Star, Zap, Target
} from 'lucide-react';

type PermissionKey = 'loc' | 'notif' | 'screen';

const DEFAULT_INTERESTS = [
  { id: InterestType.HEALTH, icon: Activity, label: 'Health' },
  { id: InterestType.PRODUCTIVITY, icon: Brain, label: 'Productivity' },
  { id: InterestType.FINANCE, icon: DollarSign, label: 'Finance' },
  { id: InterestType.LEARNING, icon: BookOpen, label: 'Learning' },
  { id: InterestType.DETOX, icon: Smartphone, label: 'Detox' },
];

const CUSTOM_ICONS = [
  { id: 'Activity', Icon: Activity },
  { id: 'BookOpen', Icon: BookOpen },
  { id: 'DollarSign', Icon: DollarSign },
  { id: 'Dumbbell', Icon: Dumbbell },
  { id: 'Droplets', Icon: Droplets },
  { id: 'Moon', Icon: Moon },
  { id: 'Sun', Icon: Sun },
  { id: 'Monitor', Icon: Monitor },
  { id: 'Coffee', Icon: Coffee },
  { id: 'Music', Icon: Music },
  { id: 'Star', Icon: Star },
  { id: 'Zap', Icon: Zap },
];

export default function Onboarding() {
  const { user, completeOnboarding } = useApp();
  const [step, setStep] = useState(1);
  
  // State
  const [availableInterests, setAvailableInterests] = useState<{ id: InterestType; icon: any; label: string }[]>(DEFAULT_INTERESTS);
  const [selectedInterests, setSelectedInterests] = useState<InterestType[]>([]);
  const [newInterestName, setNewInterestName] = useState('');
  const [isAddingInterest, setIsAddingInterest] = useState(false);

  const [finalHabits, setFinalHabits] = useState<Habit[]>([]);
  const [permissions, setPermissions] = useState({ loc: false, notif: false, screen: false });
  
  // Custom Habit Form
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customInterest, setCustomInterest] = useState<InterestType>(InterestType.HEALTH);
  const [customSchedule, setCustomSchedule] = useState<ScheduleType>(ScheduleType.DAILY);
  const [customIcon, setCustomIcon] = useState('Activity');
  // Custom Goal
  const [hasGoal, setHasGoal] = useState(false);
  const [goalTarget, setGoalTarget] = useState<string>('');
  const [goalUnit, setGoalUnit] = useState<string>('');

  // Load suggestions when interests change
  useEffect(() => {
    if (step === 3 && selectedInterests.length > 0) {
      const suggestions = db.getSuggestions(selectedInterests);
      setFinalHabits(suggestions);
    }
  }, [step, selectedInterests]);

  const toggleInterest = (id: InterestType) => {
    setSelectedInterests(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const addNewInterest = () => {
    if (!newInterestName.trim()) return;
    const name = newInterestName.trim();
    if (availableInterests.some(i => i.label.toLowerCase() === name.toLowerCase())) {
        setNewInterestName('');
        setIsAddingInterest(false);
        return;
    }

    const newInterest = { 
        id: name, 
        icon: Star, 
        label: name 
    };

    setAvailableInterests(prev => [...prev, newInterest]);
    setSelectedInterests(prev => [...prev, name]);
    setNewInterestName('');
    setIsAddingInterest(false);
  };

  const removeHabit = (id: string) => {
    setFinalHabits(prev => prev.filter(h => h.id !== id));
  };

  const saveCustomHabit = () => {
    if (!customName) return;
    
    const goalConfig = hasGoal && goalTarget && goalUnit ? {
        target: parseFloat(goalTarget),
        unit: goalUnit
    } : undefined;

    const newHabit: Habit = {
      id: `custom_${Date.now()}`,
      name: customName,
      icon: customIcon,
      interest: customInterest,
      schedule: customSchedule,
      triggerType: TriggerType.MANUAL,
      streak: 0,
      goal: goalConfig
    };
    setFinalHabits(prev => [...prev, newHabit]);
    setIsAddingCustom(false);
    setCustomName('');
    setHasGoal(false);
    setGoalTarget('');
    setGoalUnit('');
  };

  const handleFinish = () => {
    completeOnboarding(selectedInterests, finalHabits, permissions);
  };

  const CustomIconComponent = CUSTOM_ICONS.find(c => c.id === customIcon)?.Icon || Activity;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 relative overflow-hidden isolate">
      {/* Background Decor - Animated */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-15%] right-[-15%] w-[60vw] h-[60vw] bg-blue-300/30 rounded-full blur-[100px] mix-blend-multiply opacity-80 animate-blob" />
          <div className="absolute bottom-[-15%] left-[-15%] w-[60vw] h-[60vw] bg-indigo-300/30 rounded-full blur-[100px] mix-blend-multiply opacity-80 animate-blob animation-delay-2000" />
          <div className="absolute top-[40%] left-[60%] w-[40vw] h-[40vw] bg-purple-200/30 rounded-full blur-[80px] mix-blend-multiply opacity-60 animate-blob animation-delay-4000" />
          <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl"></div>
      </div>

      <div className="max-w-xl w-full bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-apple border border-white/60 p-8 md:p-12 z-10 transition-all duration-700 max-h-[90vh] overflow-y-auto no-scrollbar">
        
        {/* STEP 1: WELCOME */}
        {step === 1 && (
          <div className="text-center space-y-8 animate-fade-in">
             <div className="flex justify-center mb-4">
                <div className="w-24 h-24 bg-white rounded-[2rem] shadow-apple flex items-center justify-center p-4">
                    <img 
                      src="/logo.png" 
                      alt="GNG" 
                      className="w-full h-full object-contain"
                      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                    />
                     <span className="hidden text-3xl font-bold text-navy-900">GN</span>
                </div>
            </div>
            
            <div>
                <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Welcome, {user?.name.split(' ')[0]}</h1>
                <p className="text-slate-500 text-lg mt-3 leading-relaxed">
                Let's design a routine that unlocks your <br/> limitless potential.
                </p>
            </div>

            <button 
              onClick={() => setStep(2)}
              className="w-full h-14 bg-navy-900 text-white rounded-2xl font-semibold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-navy-900/20"
            >
              Start Design <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* STEP 2: INTERESTS */}
        {step === 2 && (
          <div className="space-y-8 animate-scale-in">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-navy-900 tracking-tight">Focus Areas</h2>
              <p className="text-slate-500 mt-2">What do you want to master?</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {availableInterests.map((item) => {
                const isSelected = selectedInterests.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleInterest(item.id)}
                    className={`
                      p-5 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-3
                      ${isSelected 
                        ? 'border-navy-900 bg-navy-900 text-white shadow-lg transform scale-[1.02]' 
                        : 'border-transparent bg-white/80 text-slate-400 hover:bg-white hover:shadow-sm'
                      }
                    `}
                  >
                    <item.icon size={28} className={isSelected ? 'text-white' : 'text-slate-300'} strokeWidth={isSelected ? 2.5 : 2} />
                    <span className="text-sm font-semibold tracking-wide">{item.label}</span>
                  </button>
                )
              })}
              
              {!isAddingInterest ? (
                  <button 
                    onClick={() => setIsAddingInterest(true)}
                    className="p-5 rounded-3xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-navy-300 hover:text-navy-900 transition-all flex flex-col items-center justify-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-navy-900 group-hover:text-white transition-colors">
                        <Plus size={18} />
                    </div>
                    <span className="text-sm font-semibold">Custom</span>
                  </button>
              ) : (
                  <div className="col-span-1 p-4 rounded-3xl bg-white shadow-lg flex flex-col justify-between animate-fade-in">
                     <input 
                        autoFocus
                        value={newInterestName}
                        onChange={(e) => setNewInterestName(e.target.value)}
                        placeholder="Name..."
                        className="w-full text-sm p-2 outline-none border-b border-slate-100 font-semibold text-navy-900 mb-2"
                        onKeyDown={(e) => e.key === 'Enter' && addNewInterest()}
                     />
                     <div className="flex gap-2">
                         <button onClick={addNewInterest} className="flex-1 bg-navy-900 text-white text-xs py-2 rounded-xl font-bold">Add</button>
                         <button onClick={() => setIsAddingInterest(false)} className="px-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200"><X size={14}/></button>
                     </div>
                  </div>
              )}
            </div>

            <button 
              onClick={() => setStep(3)}
              disabled={selectedInterests.length === 0}
              className="w-full h-14 bg-navy-900 disabled:opacity-50 text-white rounded-2xl font-semibold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 3: HABIT SELECTION */}
        {step === 3 && (
            <div className="space-y-6 animate-scale-in">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-navy-900 tracking-tight">Your Core Routine</h2>
                    <p className="text-slate-500 mt-2">Tailored to your focus areas.</p>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {finalHabits.map((h) => (
                        <div key={h.id} className="flex items-center justify-between p-4 bg-white/80 rounded-2xl shadow-sm border border-transparent hover:border-slate-100 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-navy-900">
                                     {(() => {
                                        const found = CUSTOM_ICONS.find(c => c.id === h.icon);
                                        const Icon = found ? found.Icon : Activity;
                                        return <Icon size={20} />;
                                     })()}
                                </div>
                                <div>
                                    <h4 className="font-bold text-navy-900 text-sm">{h.name}</h4>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-slate-400 font-medium mt-0.5">{h.schedule} • {h.interest}</p>
                                        {h.goal && (
                                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">
                                                Goal: {h.goal.target} {h.goal.unit}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => removeHabit(h.id)} className="w-8 h-8 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 flex items-center justify-center transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                    ))}
                </div>

                {!isAddingCustom ? (
                    <button 
                        onClick={() => setIsAddingCustom(true)}
                        className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-semibold hover:border-navy-900 hover:text-navy-900 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={20} /> Add Custom Habit
                    </button>
                ) : (
                    <div className="bg-white p-5 rounded-[1.5rem] shadow-apple animate-fade-in-up space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-navy-900">New Habit</h4>
                            <button onClick={() => setIsAddingCustom(false)} className="bg-slate-100 p-1.5 rounded-full"><X size={14}/></button>
                        </div>
                        
                        <input 
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-navy-900 outline-none"
                            placeholder="Habit Name (e.g. Drink Water)"
                        />

                        <div className="grid grid-cols-2 gap-3">
                             <select 
                                value={customInterest}
                                onChange={(e) => setCustomInterest(e.target.value as InterestType)}
                                className="h-10 px-2 rounded-xl bg-slate-50 text-xs font-medium outline-none"
                             >
                                {DEFAULT_INTERESTS.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                                {availableInterests.filter(i => !DEFAULT_INTERESTS.some(d => d.id === i.id)).map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                             </select>
                             <select 
                                value={customSchedule}
                                onChange={(e) => setCustomSchedule(e.target.value as ScheduleType)}
                                className="h-10 px-2 rounded-xl bg-slate-50 text-xs font-medium outline-none"
                             >
                                {Object.values(ScheduleType).map(t => <option key={t} value={t}>{t}</option>)}
                             </select>
                        </div>

                        {/* Goal Toggle */}
                        <div className="bg-slate-50 p-3 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                    <Target size={14} /> Set a Goal?
                                </label>
                                <input 
                                    type="checkbox" 
                                    checked={hasGoal} 
                                    onChange={(e) => setHasGoal(e.target.checked)} 
                                    className="w-4 h-4 rounded text-navy-900 focus:ring-navy-900"
                                />
                            </div>
                            
                            {hasGoal && (
                                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                                    <input 
                                        type="number"
                                        value={goalTarget}
                                        onChange={(e) => setGoalTarget(e.target.value)}
                                        placeholder="Target (e.g. 5)"
                                        className="h-9 px-2 rounded-lg bg-white border border-slate-200 text-sm focus:border-navy-900 outline-none"
                                    />
                                    <input 
                                        type="text"
                                        value={goalUnit}
                                        onChange={(e) => setGoalUnit(e.target.value)}
                                        placeholder="Unit (e.g. km)"
                                        className="h-9 px-2 rounded-lg bg-white border border-slate-200 text-sm focus:border-navy-900 outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={saveCustomHabit}
                            className="w-full bg-navy-900 text-white h-10 rounded-xl text-sm font-bold"
                        >
                            Save
                        </button>
                    </div>
                )}

                <button 
                    onClick={() => setStep(4)}
                    disabled={finalHabits.length === 0}
                    className="w-full h-14 bg-navy-900 disabled:opacity-50 text-white rounded-2xl font-semibold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg mt-4"
                >
                    Finalize Routine
                </button>
            </div>
        )}

        {/* STEP 4: PERMISSIONS */}
        {step === 4 && (
          <div className="space-y-8 animate-scale-in">
             <div className="text-center">
              <h2 className="text-2xl font-bold text-navy-900 tracking-tight">Enable Auto-Pilot</h2>
              <p className="text-slate-500 mt-2">Let myCORE handle the tracking.</p>
            </div>

            <div className="space-y-4">
              {[
                { key: 'loc' as PermissionKey, label: 'Location', desc: 'Auto-complete Gym & Work habits', icon: MapPin, color: 'blue' },
                { key: 'notif' as PermissionKey, label: 'Notifications', desc: 'Smart reminders & summaries', icon: Bell, color: 'purple' },
                { key: 'screen' as PermissionKey, label: 'Screen Time', desc: 'Activity & Detox verification', icon: Smartphone, color: 'orange' }
              ].map((perm: { key: PermissionKey; label: string; desc: string; icon: any; color: string }) => (
                  <div 
                    key={perm.key}
                    onClick={() => setPermissions((p: Record<PermissionKey, boolean>) => ({ ...p, [perm.key]: !p[perm.key] }))}
                    className={`
                        flex items-center gap-4 p-5 rounded-[1.5rem] border transition-all cursor-pointer group
                        ${permissions[perm.key] 
                            ? 'bg-navy-900 border-navy-900 text-white shadow-lg transform scale-[1.02]' 
                            : 'bg-white border-transparent hover:bg-white/60 text-slate-500'
                        }
                    `}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${permissions[perm.key] ? 'bg-white/20' : `bg-${perm.color}-50 text-${perm.color}-500`}`}>
                      <perm.icon size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold text-sm ${permissions[perm.key] ? 'text-white' : 'text-navy-900'}`}>{perm.label}</h3>
                      <p className={`text-xs ${permissions[perm.key] ? 'text-white/60' : 'text-slate-400'}`}>{perm.desc}</p>
                    </div>
                    {permissions[perm.key] && (
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-navy-900 animate-scale-in">
                            <Check size={14} strokeWidth={3} />
                        </div>
                    )}
                  </div>
              ))}
            </div>

            <button 
              onClick={handleFinish}
              className="w-full h-14 bg-navy-900 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Start Journey
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
