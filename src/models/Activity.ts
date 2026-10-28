import { ActivityEntry, Urgency } from '../types.ts';
import { Subtask } from './Subtask.ts';

/**
 * Model Activity mewakili entitas kegiatan / tugas harian pengguna.
 * Mencakup kategori umum, game, kuliah, dan rutinitas.
 */
export class Activity {
  public id: string;
  public title: string;
  public content: string;
  public category: string;
  public urgency: Urgency;
  public status: 'pending' | 'in_progress' | 'completed';
  public createdAt: string;
  public deadline: string;
  public reminderTime?: string;
  public reminderEnabled: boolean;
  public reminderSent?: boolean;

  // Detail kategori khusus (sesuai Class Diagram)
  public routineFrequency?: string;
  public gamePlatform?: string;
  public courseName?: string;
  public subtasks: Subtask[];

  constructor(params: Partial<ActivityEntry> & {
    id?: string;
    title: string;
    routineFrequency?: string;
    gamePlatform?: string;
    courseName?: string;
    subtasks?: Subtask[] | any[];
  }) {
    this.id = params.id || `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.title = (params.title || '').trim();
    this.content = params.content || '';
    this.category = params.category || 'rutinitas';
    this.urgency = params.urgency || 'medium';
    this.status = params.status || 'pending';
    this.createdAt = params.createdAt || new Date().toISOString();
    this.deadline = params.deadline || new Date().toISOString();
    this.reminderTime = params.reminderTime;
    this.reminderEnabled = params.reminderEnabled ?? false;
    this.reminderSent = params.reminderSent ?? false;

    // Kategori spesifik
    this.routineFrequency = params.routineFrequency || params.routineDetails?.frequency;
    this.gamePlatform = params.gamePlatform || params.gameDetails?.platform;
    this.courseName = params.courseName || params.courseDetails?.courseName;

    // Subtasks
    const rawSubtasks = params.subtasks || params.courseDetails?.subtasks || [];
    this.subtasks = rawSubtasks.map(item => item instanceof Subtask ? item : Subtask.fromJSON(item));
  }

  /**
   * Menambahkan subtask baru ke dalam aktivitas
   */
  public addSubtask(title: string): Subtask {
    const newSubtask = new Subtask({ title });
    this.subtasks.push(newSubtask);
    return newSubtask;
  }

  /**
   * Menghapus subtask berdasarkan id
   */
  public removeSubtask(id: string): boolean {
    const initialLength = this.subtasks.length;
    this.subtasks = this.subtasks.filter(s => s.id !== id);
    return this.subtasks.length < initialLength;
  }

  /**
   * Membalik status checklist subtask
   */
  public toggleSubtask(id: string): boolean {
    const target = this.subtasks.find(s => s.id === id);
    if (target) {
      target.toggle();
      return target.completed;
    }
    return false;
  }

  /**
   * Menandai aktivitas sebagai selesai
   */
  public markComplete(): void {
    this.status = 'completed';
    // Tandai juga semua subtask jika ada
    this.subtasks.forEach(s => {
      s.completed = true;
    });
  }

  /**
   * Memeriksa apakah kegiatan telah melewati batas waktu (deadline)
   */
  public isOverdue(now: Date = new Date()): boolean {
    if (this.status === 'completed') return false;
    const deadlineDate = new Date(this.deadline);
    if (isNaN(deadlineDate.getTime())) return false;
    return deadlineDate.getTime() < now.getTime();
  }

  /**
   * Menghitung sisa jam sampai deadline tiba
   */
  public getHoursRemaining(now: Date = new Date()): number {
    const deadlineDate = new Date(this.deadline);
    if (isNaN(deadlineDate.getTime())) return 999;
    return (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  }

  /**
   * Menghitung persentase progres penyelesaian subtask (0 - 100)
   */
  public calculateProgress(): number {
    if (this.status === 'completed') return 100;
    if (this.subtasks.length === 0) return 0;
    const completedCount = this.subtasks.filter(s => s.completed).length;
    return Math.round((completedCount / this.subtasks.length) * 100);
  }

  /**
   * Konversi ke interface ActivityEntry untuk kompatibilitas UI dan database
   */
  public toJSON(): ActivityEntry {
    const serializedSubtasks = this.subtasks.map(s => s.toJSON());

    return {
      id: this.id,
      title: this.title,
      content: this.content,
      category: this.category,
      urgency: this.urgency,
      status: this.status,
      createdAt: this.createdAt,
      deadline: this.deadline,
      reminderTime: this.reminderTime,
      reminderEnabled: this.reminderEnabled,
      reminderSent: this.reminderSent,
      gameDetails: this.gamePlatform ? { platform: this.gamePlatform } : undefined,
      courseDetails: {
        courseName: this.courseName,
        subtasks: serializedSubtasks,
      },
      routineDetails: this.routineFrequency ? {
        frequency: this.routineFrequency as any,
      } : undefined,
    };
  }

  /**
   * Factory method untuk membuat instance Activity dari ActivityEntry
   */
  public static fromJSON(entry: ActivityEntry): Activity {
    return new Activity({
      ...entry,
      gamePlatform: entry.gameDetails?.platform,
      courseName: entry.courseDetails?.courseName,
      routineFrequency: entry.routineDetails?.frequency,
      subtasks: (entry.courseDetails?.subtasks || []).map(s => Subtask.fromJSON(s)),
    });
  }
}
