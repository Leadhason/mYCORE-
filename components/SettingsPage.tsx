import React from 'react';
import { useApp } from '../App';
import { LogOut, Download, Trash2, ChevronRight, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user, resetApp, updateSettings, theme, toggleTheme } = useApp();

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(user));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "mycore_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const toggleNotifications = () => {
    if (user) {
        updateSettings({
            ...user.settings,
            notificationsEnabled: !user.settings.notificationsEnabled
        });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-navy-900">Settings</h2>

      <div className="space-y-6">
        
        {/* PROFILE CARD */}
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-navy-900 text-white flex items-center justify-center text-xl font-bold">
                {user?.name.charAt(0)}
            </div>
            <div>
                <h3 className="font-bold text-lg">{user?.name}</h3>
                <p className="text-slate-400 text-sm">Pro Member • Growth Nexis Global</p>
            </div>
        </div>

        {/* OPTIONS */}
        <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
            <button className="w-full flex items-center justify-between p-5 hover:bg-slate-50 border-b border-slate-100 transition-colors">
                <span className="font-medium text-slate-700">Edit Habits</span>
                <ChevronRight size={18} className="text-slate-400" />
            </button>
            <button 
                onClick={toggleNotifications}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 border-b border-slate-100 transition-colors"
            >
                 <span className="font-medium text-slate-700">Notifications</span>
                 <div className={`w-10 h-6 rounded-full relative transition-colors ${user?.settings.notificationsEnabled ? 'bg-green-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${user?.settings.notificationsEnabled ? 'right-1' : 'left-1'}`} />
                 </div>
            </button>
            <button 
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 border-b border-slate-100 transition-colors"
            >
                 <span className="font-medium text-slate-700">Dark Mode</span>
                 <div className={`w-10 h-6 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-navy-900' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${theme === 'dark' ? 'right-1' : 'left-1'}`} />
                 </div>
            </button>
             <button onClick={handleExport} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
                <span className="flex items-center gap-3 font-medium text-slate-700">
                    <Download size={18} /> Export Data (CSV/JSON)
                </span>
            </button>
        </div>

        {/* DANGER ZONE */}
        <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide ml-4">Privacy & Account</h3>
            <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-600 mb-2">
                        <Shield size={16} /> <span className="font-semibold text-sm">Privacy Notice</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Data is stored locally on your device. We do not track your location history on our servers. Triggers are processed on-device.
                    </p>
                </div>
                <button onClick={resetApp} className="w-full flex items-center gap-3 p-5 text-red-500 hover:bg-red-50 transition-colors">
                    <LogOut size={18} /> Sign Out & Reset Demo
                </button>
                <button className="w-full flex items-center gap-3 p-5 text-red-500 hover:bg-red-50 transition-colors border-t border-slate-100">
                    <Trash2 size={18} /> Delete Account
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}
