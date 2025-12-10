import React, { useState } from 'react';
import { useApp } from '../App.tsx';
import { Task, Project, Priority } from '../../types.ts';
import { formatDate } from '../../utils.ts';
import { 
  Plus, Calendar as CalendarIcon, List, Clock, Briefcase, 
  Flag, ChevronLeft, ChevronRight, CheckCircle2, Trash2, CheckSquare, Bell
} from 'lucide-react';
import AddTaskModal from './AddTaskModal';
import AddProjectModal from './AddProjectModal';

// --- SUB-COMPONENTS ---

const ProjectCard: React.FC<{ project: Project }> = ({ project }) => (
  <div className="min-w-[260px] bg-white p-5 rounded-[1.5rem] shadow-soft snap-center border border-transparent hover:border-slate-200 transition-all cursor-pointer">
    <div className="flex justify-between items-start mb-6">
       <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
          <Briefcase size={22} />
       </div>
       <div className="radial-progress text-xs font-bold" style={{ "--value": project.progress, "--size": "2rem" } as any}>
         {project.progress}%
       </div>
    </div>
    <h3 className="font-bold text-navy-900 text-lg truncate">{project.name}</h3>
    <p className="text-sm text-slate-400 mb-4 line-clamp-1 font-medium">{project.description || 'No description'}</p>
    
    <div className="space-y-2">
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
         <div className="h-full bg-navy-900 rounded-full transition-all duration-1000 ease-out" style={{ width: `${project.progress}%` }} />
      </div>
      <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold tracking-wide">
        <span className={project.status === 'completed' ? 'text-green-500' : 'text-slate-400'}>{project.status}</span>
        <span className="flex items-center gap-1"><Clock size={10} /> {project.endDate}</span>
      </div>
    </div>
  </div>
);

const TaskItem: React.FC<{ task: Task; onToggle: () => void; onDelete: () => void; projectName?: string }> = ({ task, onToggle, onDelete, projectName }) => (
  <div className={`group flex items-start gap-4 p-4 transition-all border-b border-slate-100 last:border-0 hover:bg-slate-50 ${task.completed ? 'opacity-50' : ''}`}>
    <button 
      onClick={onToggle}
      className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
        task.completed 
        ? 'bg-navy-900 border-navy-900 text-white' 
        : 'border-slate-300 hover:border-navy-900'
      }`}
    >
      {task.completed && <CheckCircle2 size={14} strokeWidth={3} />}
    </button>
    
    <div className="flex-1 min-w-0">
      <h4 className={`text-[15px] font-medium leading-snug ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
        {task.title}
      </h4>
      <div className="flex flex-wrap items-center gap-2 mt-1.5">
         {projectName && <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-md">{projectName}</span>}
         {task.priority !== Priority.MEDIUM && (
             <span className={`text-[10px] font-bold flex items-center gap-1 ${task.priority === Priority.HIGH ? 'text-red-500' : 'text-blue-500'}`}>
                <Flag size={10} fill="currentColor" /> {task.priority}
             </span>
         )}
         <span className={`text-[11px] font-medium flex items-center gap-1 ${new Date(task.dueDate) < new Date() && !task.completed ? 'text-red-500' : 'text-slate-400'}`}>
            {task.dueDate}
         </span>
      </div>
    </div>

    <button onClick={onDelete} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2">
       <Trash2 size={16} />
    </button>
  </div>
);

const CalendarView = ({ tasks, onDateSelect, selectedDate }: { tasks: Task[], onDateSelect: (d: string) => void, selectedDate: string }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDay = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const startDay = getFirstDay(year, month);
  const offset = startDay === 0 ? 6 : startDay - 1;

  const days = [];
  for(let i=0; i<offset; i++) days.push(null);
  for(let i=1; i<=daysInMonth; i++) days.push(new Date(year, month, i));

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-apple border border-white">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg text-navy-900 tracking-tight ml-2">{monthName}</h3>
        <div className="flex gap-1">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ChevronLeft size={20}/></button>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ChevronRight size={20}/></button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2 text-center mb-4">
         {['M','T','W','T','F','S','S'].map((d,i) => <span key={i} className="text-xs font-bold text-slate-300">{d}</span>)}
      </div>
      
      <div className="grid grid-cols-7 gap-2">
         {days.map((day, idx) => {
            if(!day) return <div key={idx} />;
            const dateStr = formatDate(day);
            const isSelected = dateStr === selectedDate;
            const isToday = formatDate(new Date()) === dateStr;
            const dayTasks = tasks.filter(t => t.dueDate === dateStr && !t.completed);
            const hasTask = dayTasks.length > 0;

            return (
              <button 
                key={idx}
                onClick={() => onDateSelect(dateStr)}
                className={`
                  relative h-10 w-10 mx-auto rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300
                  ${isSelected 
                    ? 'bg-navy-900 text-white shadow-lg scale-110' 
                    : isToday 
                        ? 'text-blue-600 bg-blue-50 font-bold' 
                        : 'text-slate-600 hover:bg-slate-100'
                  }
                `}
              >
                {day.getDate()}
                {hasTask && !isSelected && (
                   <div className="absolute bottom-1 w-1 h-1 rounded-full bg-slate-400" />
                )}
              </button>
            )
         })}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

export default function TasksPage() {
  const { tasks, projects, toggleTask, deleteTask } = useApp();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Filter Tasks
  const filteredTasks = view === 'list' 
    ? tasks.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    : tasks.filter(t => t.dueDate === selectedDate);
  
  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-navy-900 tracking-tight">Tasks & Projects</h2>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
           <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-slate-100 text-navy-900' : 'text-slate-400'}`}>
              <List size={20} />
           </button>
           <button onClick={() => setView('calendar')} className={`p-2 rounded-lg transition-all ${view === 'calendar' ? 'bg-slate-100 text-navy-900' : 'text-slate-400'}`}>
              <CalendarIcon size={20} />
           </button>
        </div>
      </div>

      {/* PROJECTS HORIZONTAL SCROLL */}
      {view === 'list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Projects</h3>
             <button onClick={() => setShowProjectModal(true)} className="text-navy-900 text-xs font-bold hover:underline">+ NEW PROJECT</button>
          </div>
          {projects.length > 0 ? (
             <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar snap-x px-2">
                {projects.map(p => <ProjectCard key={p.id} project={p} />)}
                <button onClick={() => setShowProjectModal(true)} className="min-w-[100px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[1.5rem] hover:border-navy-200 hover:bg-white transition-all text-slate-300 hover:text-navy-900">
                    <Plus size={24} />
                    <span className="text-xs font-bold mt-2">Add</span>
                </button>
             </div>
          ) : (
             <div onClick={() => setShowProjectModal(true)} className="bg-white border-2 border-dashed border-slate-100 rounded-[2rem] p-8 text-center text-slate-400 cursor-pointer hover:border-navy-200 hover:text-navy-900 transition-all">
                <Briefcase size={28} className="mx-auto mb-2 opacity-50" />
                <p className="font-medium">Create your first project</p>
             </div>
          )}
        </div>
      )}

      {/* TASKS & CALENDAR GRID */}
      <div className={`grid grid-cols-1 ${view === 'calendar' ? 'lg:grid-cols-2' : ''} gap-8`}>
         
         {view === 'calendar' && (
            <div className="animate-fade-in-up">
              <CalendarView 
                tasks={tasks} 
                onDateSelect={setSelectedDate} 
                selectedDate={selectedDate} 
              />
            </div>
         )}

         <div className="bg-white rounded-[2.5rem] p-8 shadow-apple border border-white min-h-[500px] relative animate-fade-in-up">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-navy-900 tracking-tight">
                    {view === 'calendar' ? `${new Date(selectedDate).toLocaleDateString(undefined, {weekday: 'long'})}` : 'Tasks'}
                </h3>
                <p className="text-slate-500 font-medium text-sm mt-1">{filteredTasks.filter(t => !t.completed).length} pending</p>
              </div>
              <button 
                onClick={() => setShowTaskModal(true)}
                className="w-12 h-12 bg-navy-900 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-90 transition-all"
              >
                <Plus size={24} />
              </button>
            </div>

            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-2 -mr-2">
               {filteredTasks.length > 0 ? (
                  filteredTasks.map(task => (
                    <TaskItem 
                        key={task.id} 
                        task={task} 
                        onToggle={() => toggleTask(task.id, !task.completed)}
                        onDelete={() => deleteTask(task.id)}
                        projectName={projects.find(p => p.id === task.projectId)?.name}
                    />
                  ))
               ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                     <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <CheckSquare size={32} strokeWidth={1.5} />
                     </div>
                     <p className="font-medium">No tasks found</p>
                     {view === 'calendar' && <p className="text-sm mt-1">Tap + to add a task for this day</p>}
                  </div>
               )}
            </div>
         </div>
      </div>

      {showTaskModal && <AddTaskModal onClose={() => setShowTaskModal(false)} />}
      {showProjectModal && <AddProjectModal onClose={() => setShowProjectModal(false)} />}
    </div>
  );
}