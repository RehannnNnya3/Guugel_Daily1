import React, { useState } from 'react';
import { ActivityEntry, Urgency } from '../types.ts';
import { 
  Gamepad2, 
  GraduationCap, 
  Calendar, 
  Clock, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  Timer, 
  CheckSquare, 
  XSquare, 
  RotateCcw,
  Bell,
  BellOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ActivityCardProps {
  key?: string | number;
  entry: ActivityEntry;
  onToggleStatus: (id: string) => void;
  onEdit: (entry: ActivityEntry) => void;
  onDelete: (id: string) => void;
  onQuickReschedule: (id: string, hoursToAdd: number) => void;
  onToggleSubtask?: (entryId: string, subtaskId: string) => void;
}

export default function ActivityCard({
  entry,
  onToggleStatus,
  onEdit,
  onDelete,
  onQuickReschedule,
  onToggleSubtask
}: ActivityCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Styling helper for urgency levels
  const getUrgencyBadge = (urg: Urgency) => {
    switch (urg) {
      case 'urgent':
        return {
          bg: 'bg-rose-50 border-rose-100 text-rose-700',
          dot: 'bg-rose-500',
          label: '🚨 Gawat / Mendesak'
        };
      case 'high':
        return {
          bg: 'bg-amber-50 border-amber-100 text-amber-700',
          dot: 'bg-amber-500',
          label: '⚡ Prioritas Tinggi'
        };
      case 'medium':
        return {
          bg: 'bg-blue-50 border-blue-100 text-blue-700',
          dot: 'bg-blue-500',
          label: '⏱️ Sedang'
        };
      case 'low':
        return {
          bg: 'bg-slate-50 border-slate-100 text-slate-500',
          dot: 'bg-slate-400',
          label: '☕ Rendah'
        };
    }
  };

  const getCategoryIcon = () => {
    switch (entry.category) {
      case 'game':
        return <Gamepad2 className="h-4.5 w-4.5 text-emerald-600" />;
      case 'kuliah':
        return <GraduationCap className="h-4.5 w-4.5 text-blue-600" />;
      case 'rutinitas':
        return <Calendar className="h-4.5 w-4.5 text-indigo-600" />;
      default:
        return <Clock className="h-4.5 w-4.5 text-slate-500" />;
    }
  };

  const getCategoryColor = () => {
    switch (entry.category) {
      case 'game': return 'border-l-4 border-l-purple-500';
      case 'kuliah': return 'border-l-4 border-l-blue-500';
      case 'rutinitas': return 'border-l-4 border-l-emerald-500';
      default: return 'border-l-4 border-l-indigo-400';
    }
  };

  const getCategoryLabel = () => {
    switch (entry.category) {
      case 'game': return 'Daily Game';
      case 'kuliah': return 'Tugas Kuliah';
      case 'rutinitas': return 'Rutinitas Nyata';
      default: return entry.category;
    }
  };

  // Remaining time / relative deadline helper
  const getDeadlineText = (isoString: string) => {
    const deadlineDate = new Date(isoString);
    const now = new Date();
    const diffMs = deadlineDate.getTime() - now.getTime();
    
    if (entry.status === 'completed') {
      return { text: 'Sudah Selesai 🎉', color: 'text-emerald-600 bg-emerald-50' };
    }

    if (diffMs < 0) {
      // Overdue
      const overdueMins = Math.abs(Math.floor(diffMs / (1000 * 60)));
      if (overdueMins < 60) return { text: `Terlambat ${overdueMins}m`, color: 'text-rose-600 bg-rose-50 font-bold animate-pulse' };
      const overdueHrs = Math.floor(overdueMins / 60);
      if (overdueHrs < 24) return { text: `Terlambat ${overdueHrs} jam`, color: 'text-rose-600 bg-rose-50 font-bold' };
      const overdueDays = Math.floor(overdueHrs / 24);
      return { text: `Terlambat ${overdueDays} hari`, color: 'text-rose-600 bg-rose-50 font-bold' };
    }

    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 60) return { text: `${mins}m lagi`, color: 'text-amber-700 bg-amber-50 font-medium' };
    
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return { text: `${hrs} jam lagi`, color: 'text-indigo-700 bg-indigo-50 font-medium' };
    
    const days = Math.floor(hrs / 24);
    if (days === 1) return { text: 'Besok', color: 'text-indigo-700 bg-indigo-50 font-medium' };
    return { text: `${days} hari lagi`, color: 'text-slate-600 bg-slate-50' };
  };

  const urgencyProps = getUrgencyBadge(entry.urgency);
  const deadlineBadge = getDeadlineText(entry.deadline);

  // Progress computation for College Subtasks
  const collegeProgress = () => {
    if (!entry.courseDetails?.subtasks || entry.courseDetails.subtasks.length === 0) return 0;
    const finished = entry.courseDetails.subtasks.filter(t => t.done).length;
    return Math.round((finished / entry.courseDetails.subtasks.length) * 100);
  };

  const formattedDate = new Date(entry.deadline).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  const formattedReminder = entry.reminderTime ? new Date(entry.reminderTime).toLocaleString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${getCategoryColor()} hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col`}
      id={`card_${entry.id}`}
    >
      <div className="p-5 flex-1 space-y-3">
        {/* Card Header Tag/Urgency */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 py-1 px-2.5 rounded-lg text-xs font-semibold text-slate-700">
            {getCategoryIcon()}
            <span>{getCategoryLabel()}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${urgencyProps.bg} flex items-center gap-1`}>
              <span className={`h-1.5 w-1.5 rounded-full ${urgencyProps.dot}`}></span>
              {urgencyProps.label}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${deadlineBadge.color}`}>
              {deadlineBadge.text}
            </span>
          </div>
        </div>

        {/* Title and Notes */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => onToggleStatus(entry.id)}
            className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none flex-shrink-0"
            title={entry.status === 'completed' ? 'Tandai Belum Selesai' : 'Tandai Selesai'}
            id={`btn_toggle_complete_${entry.id}`}
          >
            {entry.status === 'completed' ? (
              <CheckCircle2 className="h-5.5 w-5.5 text-emerald-500 fill-emerald-50" />
            ) : entry.status === 'in_progress' ? (
              <div className="h-5.5 w-5.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            ) : (
              <Circle className="h-5.5 w-5.5 text-slate-300 hover:border-indigo-400" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold text-slate-800 text-base leading-tight break-words ${entry.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
              {entry.title}
            </h4>
            {entry.content && (
              <p className="text-slate-500 text-xs mt-1 leading-relaxed line-clamp-2">
                {entry.content}
              </p>
            )}
          </div>
        </div>

        {/* Dynamic Inner Info Panel depending on category */}
        {entry.category === 'game' && entry.gameDetails && (
          <div className="bg-emerald-50/20 rounded-xl p-3 border border-emerald-100/50 text-xs text-emerald-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold">🎮 {entry.gameDetails.platform || 'PC'}</span>
              <span>⚡ Playtime: {entry.gameDetails.playtimeMinutes || 0}m</span>
            </div>
            {entry.gameDetails.dailyQuest && (
              <div className="pt-1.5 border-t border-emerald-100/30 font-medium italic text-emerald-700 flex items-start gap-1">
                <span className="text-[10px] bg-emerald-100 px-1 py-0.2 rounded text-emerald-800 select-none flex-shrink-0 mt-0.5">QUEST</span>
                <span className="line-clamp-2">{entry.gameDetails.dailyQuest}</span>
              </div>
            )}
            {entry.routineDetails?.frequency && (
              <div className="pt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                <span>🔄 Reset:</span>
                <span>
                  {entry.routineDetails.frequency === 'daily' ? 'Harian' : 
                   entry.routineDetails.frequency === 'weekly_monday' ? 'Tiap Senin' : 
                   entry.routineDetails.frequency === 'custom' ? `Tiap ${entry.routineDetails.customResetDays} Hari` : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {entry.category === 'kuliah' && entry.courseDetails && (
          <div className="bg-blue-50/20 rounded-xl p-3 border border-blue-100/50 text-xs text-blue-800 space-y-2">
            <div className="flex items-center justify-between font-semibold">
              <span>📚 Matkul: {entry.courseDetails.courseName}</span>
              <span>{collegeProgress()}% Selesai</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-blue-100/50 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-300" 
                style={{ width: `${collegeProgress()}%` }}
              />
            </div>

            {entry.courseDetails.subtasks && entry.courseDetails.subtasks.length > 0 && (
              <div className="pt-1 text-[11px] text-blue-700/80 space-y-1">
                {entry.courseDetails.subtasks.slice(0, 2).map((t) => (
                  <div key={t.id} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => onToggleSubtask && onToggleSubtask(entry.id, t.id)}
                      className="rounded border-blue-300 text-blue-600 h-3 w-3"
                    />
                    <span className={t.done ? 'line-through text-blue-400' : ''}>{t.text}</span>
                  </div>
                ))}
                {entry.courseDetails.subtasks.length > 2 && (
                  <button 
                    onClick={() => setExpanded(!expanded)} 
                    className="text-[10px] text-blue-600 font-bold hover:underline block mt-1"
                  >
                    {expanded ? 'Sembunyikan' : `Tampilkan ${entry.courseDetails.subtasks.length - 2} tugas pecahan lainnya...`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {entry.category === 'rutinitas' && entry.routineDetails && (
          <div className="bg-indigo-50/20 rounded-xl p-3 border border-indigo-100/50 text-xs text-indigo-800 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1">
              🔄 {entry.routineDetails.frequency === 'daily' ? 'Setiap Hari' :
                  entry.routineDetails.frequency === 'weekdays' ? 'Senin - Jumat' :
                  entry.routineDetails.frequency === 'weekly' ? 'Setiap Minggu' : 'Satu Kali'}
            </span>
            <span className="font-semibold text-indigo-700 flex items-center gap-1">
              🕒 Jam {entry.routineDetails.timeOfDay || '07:00'}
            </span>
          </div>
        )}

        {/* Expanded University subtasks checklist */}
        <AnimatePresence>
          {expanded && entry.category === 'kuliah' && entry.courseDetails?.subtasks && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-blue-50/30 rounded-xl p-3 border border-blue-100/50 text-xs text-blue-800 mt-2 space-y-1 overflow-hidden"
            >
              <h5 className="font-semibold text-blue-900 mb-1">Semua Subtask ({entry.courseDetails.subtasks.length})</h5>
              {entry.courseDetails.subtasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2 py-0.5">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => onToggleSubtask && onToggleSubtask(entry.id, t.id)}
                    className="rounded border-blue-300 text-blue-600 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span className={t.done ? 'line-through text-blue-400' : 'text-blue-800'}>{t.text}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alarm and Deadline Dates */}
        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-50">
          <div className="flex items-center gap-1 font-medium">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>Due: {formattedDate}</span>
          </div>

          {entry.reminderEnabled && entry.reminderTime && (
            <div className="flex items-center gap-1 font-medium bg-amber-50/50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100/50">
              <Bell className="h-3 w-3 animate-bounce" />
              <span>Alarm: {formattedReminder}</span>
            </div>
          )}
          {!entry.reminderEnabled && (
            <div className="flex items-center gap-1 text-slate-300">
              <BellOff className="h-3 w-3" />
              <span>Off</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Action footer (Rescheduling & Edit & Delete) */}
      <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 flex items-center justify-between text-xs">
        {/* Quick Deadline Reschedule Buttons - This satisfies: "Sama juga deadline nya bisa di atur kembali sesuai dengan kebutuhan" */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400 font-medium">Tunda:</span>
          <button
            onClick={() => onQuickReschedule(entry.id, 1)}
            className="py-0.5 px-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 hover:text-indigo-600 text-[10px] font-semibold rounded transition-all"
            title="Tunda deadline selama 1 Jam"
            id={`btn_quick_1h_${entry.id}`}
          >
            +1 Jam
          </button>
          <button
            onClick={() => onQuickReschedule(entry.id, 24)}
            className="py-0.5 px-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 hover:text-indigo-600 text-[10px] font-semibold rounded transition-all"
            title="Tunda deadline selama 1 Hari"
            id={`btn_quick_24h_${entry.id}`}
          >
            +1 Hari
          </button>
        </div>

        {/* Edit and Trash */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(entry)}
            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
            title="Edit detail kegiatan & jam alarm"
            id={`btn_edit_${entry.id}`}
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
            title="Hapus"
            id={`btn_delete_${entry.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
