import React from 'react';
import { useApp } from '../App.tsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getDayName } from '../../utils.ts';

export default function Analytics() {
  const { currentWeekInstances, habits } = useApp();

  // Prepare Data for Charts
  const chartData = Object.keys(currentWeekInstances).sort().map(date => {
    const dayInst = currentWeekInstances[date];
    const completed = dayInst.filter(i => i.completed).length;
    const total = dayInst.length;
    return {
      day: getDayName(new Date(date)),
      completed,
      total,
      val: completed, // for consistency chart (count)
      rate: total > 0 ? Math.round((completed / total) * 100) : 0 // for completion chart (percentage)
    };
  });

  const totalCompleted = chartData.reduce((acc, curr) => acc + curr.completed, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-navy-900">Performance</h2>

      {/* TOP STATS */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
           <div className="text-slate-400 text-xs font-bold uppercase tracking-wide">Weekly Completions</div>
           <div className="text-4xl font-bold text-navy-900 mt-2">{totalCompleted}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
           <div className="text-slate-400 text-xs font-bold uppercase tracking-wide">Current Streak</div>
           <div className="text-4xl font-bold text-navy-900 mt-2">
                {Math.max(0, ...habits.map(h => h.streak))} <span className="text-sm font-normal text-slate-400">days</span>
           </div>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* HABIT CONSISTENCY (COUNT) */}
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100 h-80">
          <h3 className="text-sm font-bold text-slate-800 mb-6">Habit Consistency (Count)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 20 }}>
              <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  dy={10}
              />
              <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  allowDecimals={false}
              />
              <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="val" radius={[6, 6, 6, 6]} barSize={24}>
                  {chartData.map((entry, index) => (
                      <Cell key={`cell-count-${index}`} fill={entry.completed >= entry.total ? '#0f172a' : '#cbd5e1'} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* DAILY COMPLETION RATE (%) */}
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100 h-80">
          <h3 className="text-sm font-bold text-slate-800 mb-6">Daily Completion Rate (%)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 20 }}>
              <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  dy={10}
              />
              <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  domain={[0, 100]}
              />
              <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [`${value}%`, 'Success Rate']}
              />
              <Bar dataKey="rate" radius={[6, 6, 6, 6]} barSize={24}>
                  {chartData.map((entry, index) => (
                      <Cell key={`cell-rate-${index}`} fill={entry.rate === 100 ? '#10b981' : '#0f172a'} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* STRENGTH SCORES */}
      <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Habit Strength</h3>
        <div className="space-y-4">
            {habits.map(h => (
                <div key={h.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                         <div className="w-2 h-2 rounded-full bg-slate-400" />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-700">{h.name}</span>
                            <span className="text-slate-400 font-mono">{h.streak * 10}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-navy-900 rounded-full transition-all duration-1000" 
                                style={{ width: `${Math.min(h.streak * 10, 100)}%` }} 
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}