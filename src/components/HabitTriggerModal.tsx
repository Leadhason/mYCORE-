import React, { useState, useEffect } from 'react';
import { Habit, TriggerType } from '../../types.ts';
import { MapPin, Smartphone, Zap, CheckCircle2, Loader2, TrendingUp, Search } from 'lucide-react';

interface Props {
  habit: Habit;
  onClose: () => void;
  onConfirm: (val?: number) => void;
}

export default function HabitTriggerModal({ habit, onClose, onConfirm }: Props) {
  const [step, setStep] = useState('simulate'); // simulate -> screen_time_success | location_success -> verifying -> success
  const [inputValue, setInputValue] = useState('');
  const [stockSim, setStockSim] = useState({ price: 0, change: 0, loading: false, done: false });

  // Auto transition for Location/App Open simulation
  useEffect(() => {
    if (step === 'verifying') {
        const timer = setTimeout(() => {
            if (habit.triggerType === TriggerType.LOCATION) {
                setStep('location_success');
            } else {
                onConfirm(inputValue ? parseInt(inputValue) : undefined);
            }
        }, 1500);
        return () => clearTimeout(timer);
    }
  }, [step, onConfirm, inputValue, habit.triggerType]);

  const handleAction = () => {
    setStep('verifying');
  };

  const handleStockCheck = () => {
    setStockSim({ ...stockSim, loading: true });
    // Simulate API fetch
    setTimeout(() => {
        setStockSim({ 
            price: 4120.50 + (Math.random() * 50), 
            change: 0.5 + (Math.random() * 1.5), 
            loading: false, 
            done: true 
        });
        // Auto confirm after showing result
        setTimeout(() => handleAction(), 1500);
    }, 1200);
  };

  const renderContent = () => {
    if (step === 'verifying') {
        return (
            <div className="flex flex-col items-center justify-center py-8 animate-pulse">
                <Loader2 className="w-12 h-12 text-navy-900 animate-spin mb-4" />
                <h3 className="font-semibold text-lg">Verifying Signal...</h3>
                <p className="text-slate-400 text-sm">Connecting to {habit.triggerType.toLowerCase()} service</p>
            </div>
        )
    }

    if (step === 'screen_time_success') {
        return (
            <div className="text-center space-y-4 animate-fade-in">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600">
                    <CheckCircle2 size={32} />
                </div>
                <h3 className="font-bold text-xl text-navy-900">Target Met!</h3>
                <p className="text-slate-500">
                    Your screen time of <span className="font-bold text-navy-900">{inputValue} min</span> is well within your {habit.triggerConfig?.thresholdMinutes} min limit.
                </p>
                <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-500 italic">
                    "Discipline is choosing between what you want now and what you want most."
                </div>
                <button 
                    onClick={() => onConfirm(parseInt(inputValue))} 
                    className="w-full bg-navy-900 text-white py-3 rounded-xl font-medium mt-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                    Confirm & Log Habit
                </button>
            </div>
        );
    }

    if (step === 'location_success') {
        return (
            <div className="text-center space-y-4 animate-fade-in">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600">
                    <CheckCircle2 size={32} />
                </div>
                <h3 className="font-bold text-xl text-navy-900">You're Here!</h3>
                <p className="text-slate-500">
                    Location verified at <br/> <span className="font-bold text-navy-900">{habit.triggerConfig?.locationName}</span>
                </p>
                <button 
                    onClick={() => onConfirm()} 
                    className="w-full bg-navy-900 text-white py-3 rounded-xl font-medium mt-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                    Check In & Complete
                </button>
            </div>
        );
    }

    switch(habit.triggerType) {
        case TriggerType.LOCATION:
            return (
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600">
                        <MapPin size={32} />
                    </div>
                    <h3 className="font-bold text-xl">Simulate Location</h3>
                    <p className="text-slate-500">
                        Pretend you just walked into the geofence for: <br/>
                        <span className="font-semibold text-navy-900">{habit.triggerConfig?.locationName}</span>
                    </p>
                    <button onClick={handleAction} className="w-full bg-navy-900 text-white py-3 rounded-xl font-medium mt-4 hover:bg-navy-800 transition-colors">
                        Arrive at Location
                    </button>
                </div>
            );
        case TriggerType.SCREEN_TIME:
            return (
                <div className="text-center space-y-4">
                     <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto text-purple-600">
                        <Smartphone size={32} />
                    </div>
                    <h3 className="font-bold text-xl">Daily Screen Time</h3>
                    <p className="text-slate-500">
                        Goal: Less than {habit.triggerConfig?.thresholdMinutes} minutes.
                    </p>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="text-xs text-slate-400 block mb-1 text-left">Input simulated usage (min):</label>
                        <input 
                            type="number" 
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-lg font-bold text-center outline-none focus:border-navy-900 transition-colors"
                            placeholder="e.g. 25"
                        />
                    </div>
                    <button 
                        onClick={() => {
                            if(parseInt(inputValue) < (habit.triggerConfig?.thresholdMinutes || 999)) {
                                setStep('screen_time_success');
                            } else {
                                alert("Time exceeded threshold! Habit failed for today.");
                                onClose();
                            }
                        }} 
                        disabled={!inputValue}
                        className="w-full bg-navy-900 disabled:bg-slate-300 text-white py-3 rounded-xl font-medium"
                    >
                        Verify Usage
                    </button>
                </div>
            );
        case TriggerType.APP_OPEN:
            // Check if this is a specialized Market/Finance trigger
            if (habit.triggerConfig?.actionDetail) {
                return (
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600">
                            <TrendingUp size={32} />
                        </div>
                        <h3 className="font-bold text-xl">Market Update</h3>
                        <p className="text-slate-500 text-sm">
                            {habit.triggerConfig.actionDetail} via {habit.triggerConfig.appName}
                        </p>

                        {!stockSim.done ? (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2">
                                    <Search size={16} className="text-slate-400"/>
                                    <span className="text-sm font-semibold text-slate-700">SPX</span>
                                </div>
                                <button 
                                    onClick={handleStockCheck}
                                    disabled={stockSim.loading}
                                    className="w-full bg-navy-900 text-white py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2"
                                >
                                    {stockSim.loading ? <Loader2 size={16} className="animate-spin" /> : 'Get Live Price'}
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm animate-fade-in-up">
                                <div className="text-xs text-slate-400 uppercase font-bold mb-1">S&P 500 Index</div>
                                <div className="text-3xl font-bold text-navy-900">
                                    {stockSim.price.toFixed(2)}
                                </div>
                                <div className="text-green-500 font-semibold text-sm flex items-center justify-center gap-1">
                                    <TrendingUp size={14} /> +{stockSim.change.toFixed(2)}%
                                </div>
                            </div>
                        )}
                        
                        {stockSim.done && (
                             <p className="text-xs text-slate-400 italic">Syncing to habit log...</p>
                        )}
                    </div>
                )
            }

            // Default App Open
            return (
                <div className="text-center space-y-4">
                     <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto text-orange-600">
                        <Zap size={32} />
                    </div>
                    <h3 className="font-bold text-xl">App Interaction</h3>
                    <p className="text-slate-500">
                        Simulate opening the required app: <br/>
                        <span className="font-semibold text-navy-900">{habit.triggerConfig?.appName}</span>
                    </p>
                     <button onClick={handleAction} className="w-full bg-navy-900 text-white py-3 rounded-xl font-medium mt-4">
                        Launch App & Read
                    </button>
                </div>
            );
        default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/40 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden">
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                ✕
            </button>
            {renderContent()}
        </div>
    </div>
  );
}