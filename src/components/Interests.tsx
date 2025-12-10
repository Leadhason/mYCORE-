
import React, { useState, useEffect } from 'react';
import { InterestType, Habit } from '../../types.ts';
import { useApp } from '../App.tsx';
import { 
  Play, FileText, ArrowUpRight, Star, 
  TrendingUp, Activity, CheckCircle2, Lock, 
  BookOpen, Zap, Award, ExternalLink,
  Sparkles, Heart
} from 'lucide-react';

// Mock Content Database
const BASE_CONTENT: Record<string, { id: string; title: string; type: 'video' | 'article' | 'micro'; duration: string; completed: boolean }[]> = {
  [InterestType.HEALTH]: [
    { id: 'c1', title: "10 Minute Mobility Routine", type: "video", duration: "10 min", completed: false },
    { id: 'c2', title: "The Science of Sleep", type: "article", duration: "5 min read", completed: true },
    { id: 'c3', title: "Drink 500ml Water", type: "micro", duration: "Now", completed: false },
  ],
  [InterestType.FINANCE]: [
    { id: 'c4', title: "ETF Strategies for 2024", type: "article", duration: "8 min read", completed: false },
    { id: 'c5', title: "Market Recap: Weekly", type: "video", duration: "15 min", completed: false },
  ],
  [InterestType.PRODUCTIVITY]: [
    { id: 'c6', title: "Time Blocking 101", type: "article", duration: "4 min read", completed: false },
    { id: 'c7', title: "Clear Inbox", type: "micro", duration: "Est. 5 min", completed: false },
  ],
  [InterestType.LEARNING]: [
    { id: 'c8', title: "Mental Models for Decisions", type: "article", duration: "12 min read", completed: false },
  ],
  [InterestType.DETOX]: [
    { id: 'c9', title: "Digital Minimalism Guide", type: "article", duration: "10 min read", completed: false },
    { id: 'c10', title: "Phone-free Walk", type: "micro", duration: "20 min", completed: true },
  ]
};

const HEALTH_TIPS = [
  { title: "Hydration Jumpstart", text: "Drink a large glass of water immediately after waking up to rehydrate your brain and body." },
  { title: "The 20-20-20 Rule", text: "Every 20 minutes, look at something 20 feet away for 20 seconds to reduce eye strain." },
  { title: "Walking Meetings", text: "Take your next phone call while walking. Movement boosts creativity and alertness." },
  { title: "Eat the Rainbow", text: "Aim for 3 different colors of vegetables on your plate to ensure diverse micronutrient intake." },
  { title: "Digital Sunset", text: "Turn off screens 60 minutes before bed to improve melatonin production and sleep quality." },
  { title: "Box Breathing", text: "Inhale for 4s, hold for 4s, exhale for 4s, hold for 4s. Instantly reduces stress." },
  { title: "Morning Sunlight", text: "Get 10 minutes of direct sunlight within an hour of waking to set your circadian rhythm." },
];

// Helper to generate content for custom interests
const getGeneratedContent = (interest: string) => [
  { id: `gen_${interest}_1`, title: `Mastering ${interest}: Beginner's Guide`, type: 'article' as const, duration: '6 min read', completed: false },
  { id: `gen_${interest}_2`, title: `Daily ${interest} Practice`, type: 'micro' as const, duration: '15 min', completed: false },
  { id: `gen_${interest}_3`, title: `Top Trends in ${interest}`, type: 'video' as const, duration: '12 min', completed: false },
];

export default function Interests() {
  const { user, habits } = useApp();
  
  // Default to first interest or Health
  const [activeTab, setActiveTab] = useState<InterestType>(user?.interests[0] || InterestType.HEALTH);
  const [localContent, setLocalContent] = useState(BASE_CONTENT);

  // Sync active tab safely
  useEffect(() => {
    if (user && user.interests.length > 0 && !user.interests.includes(activeTab)) {
        setActiveTab(user.interests[0]);
    }
  }, [user]);

  // Derive Visible Interests
  const visibleInterests = user?.interests && user.interests.length > 0 
      ? user.interests 
      : [InterestType.HEALTH, InterestType.PRODUCTIVITY, InterestType.FINANCE];

  // Get Content (with fallback for custom)
  const content = localContent[activeTab] || getGeneratedContent(activeTab);

  // Calculate Stats for this Interest
  const interestHabits = habits.filter(h => h.interest === activeTab);
  const totalStreak = interestHabits.reduce((acc, h) => acc + h.streak, 0);
  const activeCount = interestHabits.length;
  // Leveling Logic: Level 1 = 0-6 days total streak, Level 2 = 7+...
  const level = Math.max(1, Math.floor(totalStreak / 7) + 1);
  const progressToNextLevel = ((totalStreak % 7) / 7) * 100;

  // Daily Tip Logic
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  const dailyHealthTip = HEALTH_TIPS[dayOfYear % HEALTH_TIPS.length];

  const toggleContentComplete = (id: string) => {
    // Note: In a real app, this would persist to DB
    // Here we simulate local toggle if it exists in base, or ignore for generated
    if (localContent[activeTab]) {
      setLocalContent(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].map(item => 
          item.id === id ? { ...item, completed: !item.completed } : item
        )
      }));
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. HERO HEADER */}
      <div className="relative overflow-hidden bg-navy-900 rounded-[2.5rem] p-8 text-white shadow-glow">
        {/* Background Patterns */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl -translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="col-span-2 space-y-2">
                <div className="flex items-center gap-2 mb-4">
                    <span className="bg-white/10 backdrop-blur-md text-white/90 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/10">
                        {activeTab} Hub
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-green-300">
                        <TrendingUp size={12} /> Top Focus Area
                    </span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Level {level} {activeTab} Master</h2>
                <p className="text-navy-100 font-light text-sm max-w-md">
                    You have {activeCount} active habits building your {activeTab.toLowerCase()} foundation. Keep consistent to level up.
                </p>
                
                {/* Level Progress */}
                <div className="mt-6 max-w-sm space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-navy-200">
                        <span>Lvl {level}</span>
                        <span>{Math.round(progressToNextLevel)}% to Lvl {level + 1}</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-400 to-green-400 transition-all duration-1000" 
                            style={{ width: `${progressToNextLevel}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Interest Badge */}
            <div className="hidden md:flex justify-end">
                <div className="w-32 h-32 bg-gradient-to-br from-white/10 to-white/5 rounded-3xl border border-white/10 flex flex-col items-center justify-center backdrop-blur-sm shadow-xl">
                    <Award size={40} className="text-yellow-300 mb-2" />
                    <div className="text-2xl font-bold">{totalStreak}</div>
                    <div className="text-[10px] uppercase text-navy-200 tracking-wide">Total Days</div>
                </div>
            </div>
        </div>
      </div>

      {/* 2. TAB NAVIGATION */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 -mt-4 sticky top-20 z-20 bg-slate-50/95 backdrop-blur-sm py-2">
        {visibleInterests.map(type => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={`px-6 py-3 rounded-2xl whitespace-nowrap text-sm font-medium transition-all duration-300 ${
              activeTab === type 
                ? 'bg-white text-navy-900 shadow-md scale-105 border-navy-50' 
                : 'bg-transparent text-slate-400 hover:text-slate-600 hover:bg-white/50'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 3. CONTENT FEED (LEFT COL) */}
        <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
                    <Zap size={20} className="text-yellow-500" /> Recommended For You
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {content.map((item) => (
                    <div 
                        key={item.id} 
                        className={`group relative overflow-hidden bg-white p-5 rounded-3xl border transition-all duration-300 ${
                            item.completed 
                            ? 'border-green-100 bg-green-50/20' 
                            : 'border-slate-100 hover:border-navy-100 hover:shadow-soft cursor-pointer'
                        }`}
                        onClick={() => toggleContentComplete(item.id)}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-2xl transition-colors ${
                                item.type === 'video' ? 'bg-red-50 text-red-500 group-hover:bg-red-100' :
                                item.type === 'article' ? 'bg-blue-50 text-blue-500 group-hover:bg-blue-100' : 
                                'bg-purple-50 text-purple-500 group-hover:bg-purple-100'
                            }`}>
                                {item.type === 'video' && <Play size={20} fill="currentColor" />}
                                {item.type === 'article' && <FileText size={20} />}
                                {item.type === 'micro' && <ArrowUpRight size={20} />}
                            </div>
                            {item.completed ? (
                                <div className="bg-green-100 text-green-700 p-1 rounded-full">
                                    <CheckCircle2 size={16} />
                                </div>
                            ) : (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-6 h-6 rounded-full border-2 border-slate-200" />
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                <span>{item.type}</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                <span>{item.duration}</span>
                            </div>
                            <h4 className={`font-bold text-lg leading-tight transition-colors ${item.completed ? 'text-slate-400 line-through' : 'text-slate-800 group-hover:text-navy-900'}`}>
                                {item.title}
                            </h4>
                        </div>

                        {/* Hover Action */}
                        <div className="absolute bottom-4 right-4 translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                            <span className="text-xs font-semibold text-navy-900 flex items-center gap-1">
                                {item.completed ? 'Undo' : 'Complete'} <ArrowUpRight size={14} />
                            </span>
                        </div>
                    </div>
                ))}

                {/* Locked Future Content */}
                <div className="bg-slate-50 border border-dashed border-slate-200 p-5 rounded-3xl flex flex-col items-center justify-center text-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                        <Lock size={18} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-500 text-sm">Level {level + 1} Content</h4>
                        <p className="text-xs text-slate-400 mt-1">Keep your streak to unlock more.</p>
                    </div>
                </div>
            </div>
        </div>

        {/* 4. ACTIVE HABITS SIDEBAR (RIGHT COL) */}
        <div className="space-y-6">
            
            {/* Daily Health Tip Widget */}
            {activeTab === InterestType.HEALTH && (
                <div className="bg-green-50 border border-green-100 p-6 rounded-[2rem] relative overflow-hidden shadow-sm transition-all hover:shadow-md">
                    <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4 text-green-700">
                        <Heart size={120} fill="currentColor" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3 text-green-700">
                            <div className="p-1.5 bg-green-200/50 rounded-full">
                                <Sparkles size={14} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wide">Daily Health Tip</span>
                        </div>
                        <h4 className="font-bold text-navy-900 text-lg mb-2">{dailyHealthTip.title}</h4>
                        <p className="text-sm text-slate-600 leading-relaxed font-medium">
                            {dailyHealthTip.text}
                        </p>
                    </div>
                </div>
            )}

            <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
                <Activity size={20} className="text-blue-500" /> Active Habits
            </h3>

            <div className="bg-white rounded-[2rem] p-2 shadow-soft border border-slate-100">
                {interestHabits.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                        {interestHabits.map(h => (
                            <div key={h.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors rounded-3xl">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                    <Activity size={18} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-sm text-slate-800">{h.name}</h4>
                                    <p className="text-[10px] text-slate-400">{h.schedule}</p>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs font-bold text-navy-900">{h.streak}</div>
                                    <div className="text-[8px] uppercase text-slate-400">Day Streak</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center">
                        <p className="text-sm text-slate-400">No active habits for {activeTab}.</p>
                        <button className="mt-4 text-xs font-bold text-navy-900 underline">Add Habit</button>
                    </div>
                )}
            </div>

            {/* Weekly Challenge Mini Card */}
            <div className="bg-gradient-to-br from-navy-900 to-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg">
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-yellow-300">
                        <Star size={16} fill="currentColor" />
                        <span className="text-xs font-bold uppercase tracking-wide">Weekly Challenge</span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed mb-4">
                        Complete all {activeTab} habits for 3 days in a row to earn the "Consistent" Badge.
                    </p>
                    <button className="w-full bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl py-2 text-xs font-bold transition-all">
                        View Progress
                    </button>
                 </div>
            </div>
        </div>

      </div>
    </div>
  );
}
