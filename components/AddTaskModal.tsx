
import React, { useState } from 'react';
import { useApp } from '../App';
import { Task, Priority, ReminderType } from '../types';
import { formatDate } from '../utils';
import { X, Bell, ListChecks, Paperclip, Plus, Trash2, Link } from 'lucide-react';

export default function AddTaskModal({ onClose }: { onClose: () => void }) {
  const { addTask, projects } = useApp();
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    dueDate: formatDate(new Date()),
    priority: Priority.MEDIUM,
    category: 'General',
    reminder: { type: ReminderType.AT_DEADLINE }
  });

  // Subtasks State
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtask, setNewSubtask] = useState('');

  // Attachments State
  const [attachment, setAttachment] = useState('');

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks([...subtasks, { id: Date.now().toString() + Math.random(), title: newSubtask, completed: false }]);
    setNewSubtask('');
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    
    await addTask({
      id: `task_${Date.now()}`,
      title: formData.title,
      description: formData.description || '',
      dueDate: formData.dueDate!,
      priority: formData.priority as Priority,
      category: formData.category || 'General',
      projectId: formData.projectId,
      completed: false,
      reminder: formData.reminder,
      subtasks: subtasks,
      attachments: attachment ? [attachment] : []
    } as Task);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-navy-900">New Task</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 transition-colors">
            <X className="text-slate-400" size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            className="w-full text-lg font-semibold placeholder:text-slate-300 border-none focus:ring-0 p-0 text-navy-900"
            placeholder="What needs to be done?"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            autoFocus
          />
          <textarea 
            className="w-full text-sm text-slate-600 placeholder:text-slate-300 border-none focus:ring-0 p-0 resize-none h-20"
            placeholder="Add details..."
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Due Date</label>
              <input 
                type="date"
                className="w-full mt-1 p-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-navy-900 focus:outline-none transition-colors"
                value={formData.dueDate}
                onChange={e => setFormData({...formData, dueDate: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Priority</label>
              <select 
                className="w-full mt-1 p-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-navy-900 focus:outline-none transition-colors"
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value as Priority})}
              >
                {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="text-xs font-bold text-slate-400 uppercase">Project (Optional)</label>
               <select 
                  className="w-full mt-1 p-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-navy-900 focus:outline-none transition-colors"
                  value={formData.projectId || ''}
                  onChange={e => setFormData({...formData, projectId: e.target.value || undefined})}
               >
                  <option value="">None</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
               </select>
            </div>
            <div>
               <label className="text-xs font-bold text-slate-400 uppercase">Category</label>
               <input 
                  className="w-full mt-1 p-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-navy-900 focus:outline-none transition-colors"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  placeholder="e.g. Work"
               />
            </div>
          </div>

          {/* SUBTASKS SECTION */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div className="flex items-center gap-2 mb-2">
                <ListChecks size={14} className="text-navy-900" />
                <label className="text-xs font-bold text-slate-400 uppercase">Subtasks</label>
             </div>
             
             <div className="space-y-2 mb-3">
                {subtasks.map(st => (
                    <div key={st.id} className="flex items-center justify-between bg-white p-2 rounded-lg text-sm border border-slate-100 shadow-sm animate-fade-in">
                        <span className="truncate flex-1 mr-2 text-slate-700">{st.title}</span>
                        <button type="button" onClick={() => removeSubtask(st.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={14}/>
                        </button>
                    </div>
                ))}
             </div>

             <div className="flex gap-2">
                 <input 
                    className="flex-1 p-2 rounded-lg bg-white border border-slate-200 text-sm focus:border-navy-900 focus:outline-none placeholder:text-slate-300 transition-all"
                    placeholder="Add a subtask..."
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                 />
                 <button type="button" onClick={addSubtask} className="p-2 bg-white border border-slate-200 rounded-lg hover:border-navy-900 hover:text-navy-900 text-slate-400 transition-colors">
                     <Plus size={18} />
                 </button>
             </div>
          </div>

          {/* ATTACHMENTS SECTION */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div className="flex items-center gap-2 mb-2">
                <Paperclip size={14} className="text-navy-900" />
                <label className="text-xs font-bold text-slate-400 uppercase">Attachment (URL)</label>
             </div>
             <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2 focus-within:border-navy-900 transition-colors">
                 <Link size={14} className="text-slate-300" />
                 <input 
                    className="w-full text-sm focus:outline-none placeholder:text-slate-300 text-navy-900"
                    placeholder="e.g., https://drive.google.com/file..."
                    value={attachment}
                    onChange={e => setAttachment(e.target.value)}
                 />
             </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div className="flex items-center gap-2 mb-2">
                <Bell size={14} className="text-navy-900" />
                <label className="text-xs font-bold text-slate-400 uppercase">Smart Reminder</label>
             </div>
             <select 
                className="w-full p-2 rounded-lg bg-white border border-slate-200 text-sm focus:border-navy-900 focus:outline-none transition-colors"
                value={formData.reminder?.type}
                onChange={e => {
                    const newType = e.target.value as ReminderType;
                    setFormData({
                        ...formData, 
                        reminder: { 
                            type: newType, 
                            customDate: newType === ReminderType.CUSTOM ? formData.reminder?.customDate : undefined
                        }
                    });
                }}
             >
                {Object.values(ReminderType).map(t => <option key={t} value={t}>{t}</option>)}
             </select>

             {formData.reminder?.type === ReminderType.CUSTOM && (
                 <div className="mt-3 animate-fade-in">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Custom Time</label>
                    <input 
                        type="datetime-local"
                        className="w-full p-2 rounded-lg bg-white border border-slate-200 text-sm focus:border-navy-900 focus:outline-none transition-colors"
                        value={formData.reminder?.customDate || ''}
                        onChange={e => setFormData({
                            ...formData, 
                            reminder: { 
                                ...formData.reminder!, 
                                customDate: e.target.value 
                            }
                        })}
                    />
                 </div>
             )}
          </div>

          <button type="submit" className="w-full bg-navy-900 text-white py-3 rounded-xl font-medium shadow-lg hover:bg-navy-800 transition-all">
            Create Task
          </button>
        </form>
      </div>
    </div>
  );
}
