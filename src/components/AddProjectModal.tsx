import React, { useState } from 'react';
import { useApp } from '../App.tsx';
import { Project } from '../../types.ts';
import { formatDate } from '../../utils.ts';
import { X } from 'lucide-react';

export default function AddProjectModal({ onClose }: { onClose: () => void }) {
  const { addProject } = useApp();
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    description: '',
    startDate: formatDate(new Date()),
    endDate: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // +1 week
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    await addProject({
      id: `proj_${Date.now()}`,
      name: formData.name,
      description: formData.description,
      startDate: formData.startDate!,
      endDate: formData.endDate!,
      progress: 0,
      status: 'active'
    } as Project);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-navy-900">New Project</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 transition-colors">
            <X className="text-slate-400" size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            className="w-full text-lg font-semibold placeholder:text-slate-300 border-none focus:ring-0 p-0 text-navy-900"
            placeholder="Project Name"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            autoFocus
          />
          <textarea 
            className="w-full text-sm text-slate-600 placeholder:text-slate-300 border-none focus:ring-0 p-0 resize-none h-20"
            placeholder="Project Description"
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Start Date</label>
              <input 
                type="date"
                className="w-full mt-1 p-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-navy-900 focus:outline-none transition-colors"
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">End Date</label>
              <input 
                type="date"
                className="w-full mt-1 p-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-navy-900 focus:outline-none transition-colors"
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-navy-900 text-white py-3 rounded-xl font-medium shadow-lg hover:bg-navy-800 transition-all">
            Create Project
          </button>
        </form>
      </div>
    </div>
  );
}