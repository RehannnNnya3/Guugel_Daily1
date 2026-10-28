/**
 * Model User mewakili entitas pengguna dalam sistem Catatan Harian & Finansial.
 * Sesuai revisi Class Diagram (atribut photoUrl telah dihapus).
 */
export class User {
  public userId: string;
  public username: string;
  public name: string;
  public email: string;
  public createdAt: string;

  constructor(params: {
    userId?: string;
    id?: string;
    username: string;
    name: string;
    email: string;
    createdAt?: string;
  }) {
    this.userId = params.userId || params.id || `usr_${Date.now()}`;
    this.username = params.username.trim();
    this.name = params.name.trim();
    this.email = params.email.trim();
    this.createdAt = params.createdAt || new Date().toISOString();
  }

  /**
   * Validasi format email pengguna
   */
  public validateEmail(): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(this.email);
  }

  /**
   * Mengambil nama tampilan utama
   */
  public getDisplayName(): string {
    return this.name || this.username || 'Pengguna';
  }

  /**
   * Serialisasi ke representasi JSON polos
   */
  public toJSON() {
    return {
      id: this.userId,
      userId: this.userId,
      username: this.username,
      name: this.name,
      email: this.email,
      createdAt: this.createdAt,
    };
  }

  /**
   * Factory method untuk membuat instance dari data JSON
   */
  public static fromJSON(data: any): User {
    return new User({
      userId: data.userId || data.id,
      username: data.username || '',
      name: data.name || '',
      email: data.email || '',
      createdAt: data.createdAt,
    });
  }
}
