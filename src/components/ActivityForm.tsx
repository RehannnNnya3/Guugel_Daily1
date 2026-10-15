import React, { useState, useEffect } from 'react';
import { ActivityEntry, Urgency, SubTask } from '../types.ts';
import { 
  Gamepad2, 
  GraduationCap, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  CheckSquare, 
  Tag, 
  PlusCircle, 
  X,
  Sparkles,
  Bot
} from 'lucide-react';
import { motion } from 'motion/react';
import { playSuccessSound } from '../utils/audio.ts';

interface ActivityFormProps {
  initialData?: ActivityEntry | null;
  onSave: (entry: Omit<ActivityEntry, 'id' | 'createdAt'> & { id?: string }) => void;
  onCancel: () => void;
  customCategories: string[];
  onAddCategory: (category: string) => void;
}

export default function ActivityForm({ 
  initialData, 
  onSave, 
  onCancel, 
  customCategories,
  onAddCategory 
}: ActivityFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'game' | 'kuliah' | 'rutinitas' | string>('game');
  const [urgency, setUrgency] = useState<Urgency>('medium');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  
  // Set deadline default to tomorrow at 09:00
  const getTomorrowString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    // Format to YYYY-MM-DDTHH:MM
    const tzoffset = tomorrow.getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = (new Date(tomorrow.getTime() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  const [deadline, setDeadline] = useState(getTomorrowString());
  const [reminderEnabled, setReminderEnabled] = useState(true);
  
  // Reminder trigger types: 'at_deadline', 'before_15m', 'before_1h', 'before_2h', 'custom_time'
  const [reminderType, setReminderType] = useState<'at_deadline' | 'before_15m' | 'before_1h' | 'before_2h' | 'custom'>('before_1h');
  const [customReminderTime, setCustomReminderTime] = useState(getTomorrowString());

  // Game details
  const [platform, setPlatform] = useState('PC');
  const [dailyQuest, setDailyQuest] = useState('');
  const [resetFrequency, setResetFrequency] = useState('none');
  const [customResetDays, setCustomResetDays] = useState(14);
  const [playtimeMinutes, setPlaytimeMinutes] = useState(60);

  // University assignment details
  const [courseName, setCourseName] = useState('');
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [estimatedHours, setEstimatedHours] = useState<number | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiBreakdown = async () => {
    if (!courseName.trim() && !title.trim()) {
      setAiError('Silakan masukkan Judul Kegiatan atau Nama Mata Kuliah terlebih dahulu.');
      return;
    }
    setAiError(null);
    setIsGeneratingSubtasks(true);
    try {
      const res = await fetch('/api/ai/breakdown-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName: courseName.trim(),
          title: title.trim(),
          content: content.trim()
        })
      });
      if (!res.ok) throw new Error('Gagal memproses AI breakdown');
      const data = await res.json();
      if (Array.isArray(data.subtasks) && data.subtasks.length > 0) {
        const newTasks: SubTask[] = data.subtasks.map((st: { text: string }, idx: number) => ({
          id: `ai-${Date.now()}-${idx}`,
          text: st.text,
          done: false
        }));
        setSubtasks(newTasks);
        playSuccessSound();
      }
      if (data.advice) setAiAdvice(data.advice);
      if (data.estimatedHours) setEstimatedHours(data.estimatedHours);
    } catch (err: any) {
      console.error(err);
      setAiError('Terjadi kendala saat memecah tugas secara otomatis.');
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  // Daily routine details
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'weekdays' | 'custom'>('daily');
  const [timeOfDay, setTimeOfDay] = useState('07:00');

  // Custom Category adding
  const [showAddCatInput, setShowAddCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setContent(initialData.content);
      setCategory(initialData.category);
      setUrgency(initialData.urgency);
      setStatus(initialData.status);
      setDeadline(initialData.deadline.substring(0, 16));
      setReminderEnabled(initialData.reminderEnabled);
      
      if (initialData.reminderTime) {
        setCustomReminderTime(initialData.reminderTime.substring(0, 16));
        setReminderType('custom');
      } else {
        setReminderType('before_1h');
      }

      if (initialData.gameDetails) {
        setPlatform(initialData.gameDetails.platform || 'PC');
        setDailyQuest(initialData.gameDetails.dailyQuest || '');
        setResetFrequency(initialData.routineDetails?.frequency || 'none');
        setCustomResetDays(initialData.routineDetails?.customResetDays || 14);
        setPlaytimeMinutes(initialData.gameDetails.playtimeMinutes || 60);
      }

      if (initialData.courseDetails) {
        setCourseName(initialData.courseDetails.courseName || '');
        setSubtasks(initialData.courseDetails.subtasks || []);
      }

      if (initialData.routineDetails) {
        setFrequency(initialData.routineDetails.frequency || 'daily');
        setTimeOfDay(initialData.routineDetails.timeOfDay || '07:00');
      }
    }
  }, [initialData]);

  // Automatically adjust custom reminder time if user changes deadline and uses relative reminders
  useEffect(() => {
    if (reminderType !== 'custom' && deadline) {
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) return;

      let adjustmentMinutes = 0;
      if (reminderType === 'before_15m') adjustmentMinutes = 15;
      else if (reminderType === 'before_1h') adjustmentMinutes = 60;
      else if (reminderType === 'before_2h') adjustmentMinutes = 120;

      const reminderDate = new Date(deadlineDate.getTime() - adjustmentMinutes * 60000);
      const tzoffset = reminderDate.getTimezoneOffset() * 60000;
      const formatted = new Date(reminderDate.getTime() - tzoffset).toISOString().slice(0, 16);
      setCustomReminderTime(formatted);
    }
  }, [deadline, reminderType]);

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;
    const newTask: SubTask = {
      id: Date.now().toString(),
      text: newSubtaskText.trim(),
      done: false
    };
    setSubtasks([...subtasks, newTask]);
    setNewSubtaskText('');
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks(subtasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(t => t.id !== id));
  };

  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim() && !customCategories.includes(newCatName.trim())) {
      onAddCategory(newCatName.trim());
      setCategory(newCatName.trim());
      setNewCatName('');
      setShowAddCatInput(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Build the final details based on selected category
    let gameDetails;
    let courseDetails;
    let routineDetails;

    if (category === 'game') {
      gameDetails = { platform, dailyQuest, playtimeMinutes };
      if (resetFrequency !== 'none') {
        routineDetails = {
          frequency: resetFrequency as any,
          customResetDays: resetFrequency === 'custom' ? customResetDays : undefined,
          lastResetAt: initialData?.routineDetails?.lastResetAt || undefined
        };
      }
    } else if (category === 'kuliah') {
      courseDetails = { courseName, subtasks };
    } else if (category === 'rutinitas') {
      routineDetails = { frequency, timeOfDay };
    }

    // Save reminder time
    let finalReminderTime: string | undefined = undefined;
    if (reminderEnabled) {
      finalReminderTime = new Date(customReminderTime).toISOString();
    }

    const payload: any = {
      ...(initialData?.id && { id: initialData.id }),
      title: title.trim(),
      content: content.trim(),
      category,
      urgency,
      status,
      deadline: new Date(deadline).toISOString(),
      reminderEnabled,
      reminderSent: initialData?.reminderSent || false,
    };
    
    if (finalReminderTime !== undefined) payload.reminderTime = finalReminderTime;
    if (gameDetails !== undefined) payload.gameDetails = gameDetails;
    if (courseDetails !== undefined) payload.courseDetails = courseDetails;
    if (routineDetails !== undefined) payload.routineDetails = routineDetails;

    onSave(payload as any);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden max-w-2xl w-full mx-auto" id="activity_form_container">
      {/* Form Header */}
      <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            {category === 'game' && <Gamepad2 className="h-5 w-5" />}
            {category === 'kuliah' && <GraduationCap className="h-5 w-5" />}
            {category === 'rutinitas' && <Calendar className="h-5 w-5" />}
            {category !== 'game' && category !== 'kuliah' && category !== 'rutinitas' && <Tag className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-lg">
              {initialData ? 'Edit Catatan Harian' : 'Tambah Catatan Baru'}
            </h3>
            <p className="text-xs text-slate-500">Isi detail aktivitas dengan rapi dan tentukan prioritas.</p>
          </div>
        </div>
        <button 
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
          title="Tutup"
          id="btn_cancel_header"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
        
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Judul Kegiatan <span className="text-rose-500">*</span></label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Farming Genshin, Tugas Kalkulus, Olahraga Sore..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all text-sm"
            id="input_title"
          />
        </div>

        {/* Categories / Tag */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Kategori Utama</label>
          <div className="grid grid-cols-3 gap-2.5 mb-2.5">
            <button
              type="button"
              onClick={() => setCategory('game')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                category === 'game'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm shadow-emerald-500/5'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              id="category_game_btn"
            >
              <Gamepad2 className="h-4 w-4" />
              Daily Game
            </button>
            <button
              type="button"
              onClick={() => setCategory('kuliah')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                category === 'kuliah'
                  ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm shadow-blue-500/5'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              id="category_kuliah_btn"
            >
              <GraduationCap className="h-4 w-4" />
              Tugas Kuliah
            </button>
            <button
              type="button"
              onClick={() => setCategory('rutinitas')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                category === 'rutinitas'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm shadow-indigo-500/5'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              id="category_rutinitas_btn"
            >
              <Calendar className="h-4 w-4" />
              Rutinitas Nyata
            </button>
          </div>

          {/* Custom Categories Tag */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {customCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`flex items-center gap-1.5 py-1 px-3 rounded-lg text-xs font-medium border transition-all ${
                  category === cat
                    ? 'bg-slate-800 border-slate-900 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Tag className="h-3 w-3" />
                {cat}
              </button>
            ))}

            {!showAddCatInput ? (
              <button
                type="button"
                onClick={() => setShowAddCatInput(true)}
                className="flex items-center gap-1 py-1 px-2.5 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-dashed border-indigo-200 transition-all"
                id="add_custom_category_toggle"
              >
                <Plus className="h-3 w-3" />
                Tag Baru
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-indigo-50/50 p-1 rounded-lg border border-indigo-100">
                <input
                  type="text"
                  placeholder="Nama tag..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="px-2 py-0.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-indigo-500 text-slate-800"
                  id="new_cat_name_input"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddNewCategory}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                  id="save_new_cat_btn"
                >
                  <PlusCircle className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCatInput(false)}
                  className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Fields based on Category */}
        <div className="bg-slate-50/70 p-4.5 rounded-2xl border border-slate-100">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Detail Kategori Khusus</h4>
          
          {/* 1. Game Details */}
          {category === 'game' && (
            <div className="space-y-4" id="details_game_panel">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Platform Game</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 text-sm"
                  >
                    <option value="PC">PC (Steam, Epic, dll)</option>
                    <option value="Mobile">Mobile (Android, iOS)</option>
                    <option value="PlayStation">PlayStation</option>
                    <option value="Xbox">Xbox</option>
                    <option value="Nintendo Switch">Nintendo Switch</option>
                    <option value="Emulator">Emulator / Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Target Bermain (Menit)</label>
                  <input
                    type="number"
                    min="1"
                    value={playtimeMinutes}
                    onChange={(e) => setPlaytimeMinutes(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Misi / Quest Game</label>
                <input
                  type="text"
                  value={dailyQuest}
                  onChange={(e) => setDailyQuest(e.target.value)}
                  placeholder="Contoh: Selesaikan 4 Komisi Harian & klaim hadiah Katherine"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 text-sm mb-4"
                />
              </div>
              
              <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                <label className="block text-xs font-bold text-indigo-800 mb-2">Jadwal Reset Konten (Otomatis Uncheck)</label>
                <select
                  value={resetFrequency}
                  onChange={(e) => setResetFrequency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-indigo-900 text-sm font-medium mb-2"
                >
                  <option value="none">Tidak ada reset (Sekali jalan)</option>
                  <option value="daily">Daily Quest (Reset Tiap Hari)</option>
                  <option value="weekly_monday">Weekly Content (Reset Tiap Senin)</option>
                  <option value="custom">Endgame Content (Custom Hari)</option>
                </select>
                
                {resetFrequency === 'custom' && (
                  <div className="flex items-center gap-2 mt-2 animate-in fade-in zoom-in duration-200">
                    <span className="text-xs text-indigo-700 font-medium">Reset setiap</span>
                    <input 
                      type="number"
                      min="2"
                      value={customResetDays}
                      onChange={(e) => setCustomResetDays(parseInt(e.target.value) || 2)}
                      className="w-16 px-2 py-1 rounded-lg border border-indigo-200 text-center text-sm font-bold text-indigo-900"
                    />
                    <span className="text-xs text-indigo-700 font-medium">hari</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. College Details */}
          {category === 'kuliah' && (
            <div className="space-y-4" id="details_kuliah_panel">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nama Mata Kuliah</label>
                <input
                  type="text"
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="Contoh: Aljabar Linear, Kecerdasan Buatan"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 text-sm"
                />
              </div>

              {/* Subtasks checklist */}
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="block text-xs font-medium text-slate-600">Langkah Pengerjaan / Subtask ({subtasks.length})</label>
                  <button
                    type="button"
                    onClick={handleAiBreakdown}
                    disabled={isGeneratingSubtasks}
                    className="py-1 px-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    title="Pecah tugas kuliah ini secara otomatis menggunakan AI"
                    id="btn_ai_breakdown_subtasks"
                  >
                    {isGeneratingSubtasks ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Menganalisis tugas...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                        <span>✨ Auto-Breakdown (AI)</span>
                      </>
                    )}
                  </button>
                </div>

                {aiError && (
                  <div className="mb-2 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                    {aiError}
                  </div>
                )}

                {aiAdvice && (
                  <div className="mb-2.5 p-2.5 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-indigo-950">Strategi Pengerjaan: </span>
                      <span>{aiAdvice}</span>
                      {estimatedHours && (
                        <span className="ml-1.5 inline-block font-bold text-indigo-700 bg-white/80 px-1.5 py-0.5 rounded border border-indigo-200/50">
                          ⏱️ Est: ~{estimatedHours} jam
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {subtasks.length > 0 && (
                  <div className="space-y-1.5 mb-3 bg-white p-2.5 rounded-xl border border-slate-150 max-h-40 overflow-y-auto">
                    {subtasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between gap-2 text-sm text-slate-700 py-1 px-1.5 hover:bg-slate-50 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer select-none flex-1">
                          <input
                            type="checkbox"
                            checked={task.done}
                            onChange={() => handleToggleSubtask(task.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className={task.done ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}>
                            {task.text}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(task.id)}
                          className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    placeholder="Tambah tugas pecahan... (cth: Cari materi di jurnal)"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 text-sm text-slate-800"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-950 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Routine Details */}
          {category === 'rutinitas' && (
            <div className="grid grid-cols-2 gap-4" id="details_rutinitas_panel">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Frekuensi Pengulangan</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 text-sm"
                >
                  <option value="daily">Setiap Hari</option>
                  <option value="weekdays">Senin s/d Jumat (Hari Kerja)</option>
                  <option value="weekly">Setiap Minggu</option>
                  <option value="custom">Sekali Saja</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Jam Rutinitas</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="time"
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Custom Categories general fallbacks */}
          {category !== 'game' && category !== 'kuliah' && category !== 'rutinitas' && (
            <div className="text-slate-500 text-xs py-1.5 px-1 flex items-center gap-2">
              <Tag className="h-4 w-4 text-slate-400" />
              <span>Aktivitas berlabel khusus <strong>{category}</strong>. Atur prioritas dan deadline di bawah untuk memantau.</span>
            </div>
          )}
        </div>

        {/* Level Urgensi & Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Level Urgensi</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'urgent', label: 'Mendesak 🚨', color: 'border-rose-200 text-rose-700 bg-rose-50/30 active:bg-rose-100 hover:bg-rose-50' },
                { val: 'high', label: 'Tinggi ⚡', color: 'border-amber-200 text-amber-700 bg-amber-50/30 active:bg-amber-100 hover:bg-amber-50' },
                { val: 'medium', label: 'Sedang ⏱️', color: 'border-blue-200 text-blue-700 bg-blue-50/30 active:bg-blue-100 hover:bg-blue-50' },
                { val: 'low', label: 'Rendah ☕', color: 'border-slate-200 text-slate-600 bg-slate-50/30 active:bg-slate-100 hover:bg-slate-50' }
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setUrgency(opt.val as Urgency)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                    urgency === opt.val
                      ? `${opt.color.split(' ')[0]} ${opt.color.split(' ')[1]} ${opt.color.split(' ')[2]} ring-2 ring-indigo-500/10 scale-[1.02]`
                      : 'border-slate-150 text-slate-500 bg-white hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status Progress</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 text-sm"
              id="select_status"
            >
              <option value="pending">Belum Mulai (Pending)</option>
              <option value="in_progress">Sedang Dikerjakan (In Progress)</option>
              <option value="completed">Selesai (Completed)</option>
            </select>
          </div>
        </div>

        {/* Deskripsi Catatan */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Deskripsi / Catatan Tambahan (Optional)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2.5}
            placeholder="Tambahkan detail strategi bermain, instruksi tugas kuliah, atau rincian kegiatan rutinitas nyata..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all text-sm resize-none"
            id="textarea_content"
          />
        </div>

        {/* Deadline (Editable) & customizable trigger */}
        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-indigo-600" />
            <h4 className="text-sm font-semibold text-slate-800">Deadline & Jadwal Pengingat</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal & Waktu Batas Akhir (Deadline)</label>
              <input
                type="datetime-local"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 text-sm"
                id="input_deadline"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600">Aktifkan Alarm Pengingat</label>
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  id="checkbox_reminder"
                />
              </div>

              {reminderEnabled ? (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <select
                    value={reminderType}
                    onChange={(e) => setReminderType(e.target.value as any)}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none text-slate-700 text-xs"
                    id="select_reminder_type"
                  >
                    <option value="at_deadline">Tepat di Waktu Deadline</option>
                    <option value="before_15m">15 Menit Sebelum</option>
                    <option value="before_1h">1 Jam Sebelum</option>
                    <option value="before_2h">2 Jam Sebelum</option>
                    <option value="custom">Pilih Waktu Kustom</option>
                  </select>

                  <input
                    type="datetime-local"
                    disabled={reminderType !== 'custom'}
                    value={customReminderTime}
                    onChange={(e) => setCustomReminderTime(e.target.value)}
                    className={`px-2 py-1.5 rounded-lg border text-xs focus:outline-none ${
                      reminderType === 'custom'
                        ? 'bg-white border-slate-200 text-slate-800 focus:ring-1 focus:ring-indigo-500'
                        : 'bg-slate-100 border-slate-150 text-slate-500 cursor-not-allowed'
                    }`}
                    id="input_reminder_custom_time"
                  />
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 mt-2.5">
                  Pengingat dinonaktifkan. Anda tidak akan menerima alarm push untuk aktivitas ini.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all"
            id="btn_cancel"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition-all flex items-center gap-1.5"
            id="btn_save"
          >
            Simpan Catatan
          </button>
        </div>
      </form>
    </div>
  );
}
