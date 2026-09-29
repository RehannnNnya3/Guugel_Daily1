import React from 'react';
import { Bell, Gamepad2, GraduationCap, Calendar, Clock, Check, X, Timer } from 'lucide-react';
import { ActivityEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationToastProps {
  activeNotification: {
    id: string;
    entry: ActivityEntry;
    type: 'alarm' | 'deadline';
  } | null;
  onDismiss: () => void;
  onComplete: (id: string) => void;
  onSnooze: (id: string) => void;
}

export default function NotificationToast({
  activeNotification,
  onDismiss,
  onComplete,
  onSnooze
}: NotificationToastProps) {
  if (!activeNotification) return null;

  const { entry, type } = activeNotification;

  const getCategoryIcon = () => {
    switch (entry.category) {
      case 'game':
        return <Gamepad2 className="h-5 w-5 text-emerald-600" />;
      case 'kuliah':
        return <GraduationCap className="h-5 w-5 text-blue-600" />;
      case 'rutinitas':
        return <Calendar className="h-5 w-5 text-indigo-600" />;
      default:
        return <Clock className="h-5 w-5 text-slate-500" />;
    }
  };

  const getCategoryColor = () => {
    switch (entry.category) {
      case 'game': return 'border-emerald-500 bg-emerald-50/90';
      case 'kuliah': return 'border-blue-500 bg-blue-50/90';
      case 'rutinitas': return 'border-indigo-500 bg-indigo-50/90';
      default: return 'border-slate-400 bg-slate-50/90';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full" id="push_notification_toast">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 overflow-hidden"
        >
          {/* Progress bar animation timer */}
          <div className="h-1 bg-indigo-500 w-full animate-[shrink_10s_linear]" />
          
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0 animate-bounce">
                <Bell className="h-5 w-5 text-amber-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-amber-400 mb-0.5">
                  <span>{type === 'alarm' ? '🚨 Alarm Pengingat' : '⏰ Batas Akhir (Deadline)'}</span>
                </div>
                <h4 className="font-bold text-sm text-white truncate">{entry.title}</h4>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed line-clamp-2">
                  {entry.content || `Waktunya menyelesaikan aktivitas ${entry.category === 'game' ? 'game' : entry.category === 'kuliah' ? 'kuliah' : 'rutinitas'} harian Anda.`}
                </p>
              </div>

              <button
                onClick={onDismiss}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                id="btn_toast_close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* In-app action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onComplete(entry.id)}
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm"
                id="btn_toast_complete"
              >
                <Check className="h-3.5 w-3.5" /> Selesai
              </button>
              
              <button
                onClick={() => onSnooze(entry.id)}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1"
                id="btn_toast_snooze"
                title="Tunda deadline dan alarm selama 15 Menit"
              >
                <Timer className="h-3.5 w-3.5 text-amber-400" /> Tunda 15m
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
