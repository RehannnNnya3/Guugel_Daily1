import { SubTask as ISubTask } from '../types.ts';

/**
 * Model Subtask mewakili rincian langkah kerja dalam Activity (misal pada tugas kuliah).
 * Menggunakan penamaan baku: title dan completed.
 */
export class Subtask {
  public id: string;
  public title: string;
  public completed: boolean;

  constructor(params: {
    id?: string;
    title: string;
    completed?: boolean;
    // Dukungan backward-compatibility
    text?: string;
    done?: boolean;
  }) {
    this.id = params.id || `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.title = (params.title || params.text || '').trim();
    this.completed = params.completed ?? params.done ?? false;
  }

  /**
   * Mengubah status penyelesaian subtask (toggle)
   */
  public toggle(): boolean {
    this.completed = !this.completed;
    return this.completed;
  }

  /**
   * Mengganti judul langkah tugas
   */
  public rename(newTitle: string): void {
    if (newTitle && newTitle.trim().length > 0) {
      this.title = newTitle.trim();
    }
  }

  /**
   * Memeriksa apakah subtask sudah selesai
   */
  public isCompleted(): boolean {
    return this.completed;
  }

  /**
   * Konversi ke interface standar SubTask
   */
  public toJSON(): ISubTask {
    return {
      id: this.id,
      title: this.title,
      completed: this.completed,
      text: this.title,
      done: this.completed,
    };
  }

  /**
   * Factory method dari data JSON / ISubTask
   */
  public static fromJSON(data: any): Subtask {
    return new Subtask({
      id: data.id,
      title: data.title || data.text || '',
      completed: data.completed ?? data.done ?? false,
    });
  }
}
