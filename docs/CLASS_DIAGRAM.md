# Class Diagram Sistem Catatan Harian & Finansial

Dokumen ini memuat spesifikasi visual dan teks dari **Class Diagram** yang telah diselaraskan dengan basis data MySQL (`database/schema.sql`) dan implementasi OOP TypeScript (`src/models/`).

---

## 1. Kode Diagram (Mermaid)

Anda dapat menyalin kode Mermaid di bawah ini ke editor Markdown (seperti GitHub, Notion, Obsidian) atau ke [Mermaid Live Editor](https://mermaid.live/) untuk merender diagram visualnya secara langsung:

```mermaid
classDiagram
    direction TB

    class User {
        -string userId
        -string username
        -string name
        -string email
        -datetime createdAt
        +validateEmail() boolean
        +getDisplayName() string
        +toJSON() object
    }

    class Activity {
        -string id
        -string title
        -string content
        -string category
        -string urgency
        -string status
        -datetime createdAt
        -datetime deadline
        -string reminderTime
        -boolean reminderEnabled
        -string routineFrequency
        -string gamePlatform
        -string courseName
        -Subtask[] subtasks
        +addSubtask(string title) Subtask
        +removeSubtask(string id) boolean
        +toggleSubtask(string id) boolean
        +markComplete() void
        +isOverdue() boolean
        +getHoursRemaining() double
        +calculateProgress() int
        +toJSON() object
    }

    class Subtask {
        -string id
        -string title
        -boolean completed
        +toggle() boolean
        +rename(string newTitle) void
        +isCompleted() boolean
        +toJSON() object
    }

    class FinanceTransaction {
        -string id
        -string type
        -double amount
        -string sourceAccount
        -string destinationAccount
        -string category
        -string description
        -datetime date
        -datetime createdAt
        -string userId
        +isExpense() boolean
        +isIncome() boolean
        +isTransfer() boolean
        +getFormattedAmount() string
        +toJSON() object
    }

    class Account {
        -string id
        -string name
        -string type
        -double balance
        +credit(double amount) void
        +debit(double amount) boolean
        +getBalance() double
        +getFormattedBalance() string
        +toJSON() object
    }

    class SmartEngine {
        -Activity[] activities
        -FinanceTransaction[] transactions
        +calculateExecutiveSummary() SmartExecutiveSummary
        +calculateFinancialPulse() FinancialPulse
        +calculateHabitPulse() HabitPulse
        +selectNextBestAction() NextBestAction
        +getRecommendedFocusBlock() object
    }

    %% Relasi Antar Kelas
    User "1" *-- "0..*" Activity : owns
    User "1" *-- "0..*" FinanceTransaction : records
    User "1" *-- "0..*" Account : manages
    Activity "1" *-- "0..*" Subtask : contains
    Account "1" o-- "0..*" FinanceTransaction : settles
    SmartEngine ..> Activity : analyzes
    SmartEngine ..> FinanceTransaction : analyzes
```

---

## 2. Lokasi File Kerangka Kode (Skeleton Code di Proyek)

Implementasi kelas-kelas di atas tersimpan pada folder:
`src/models/`

| Nama File | Kelas Utama | Deskripsi |
| :--- | :--- | :--- |
| `src/models/User.ts` | `User` | Entitas pengguna tanpa atribut `photoUrl`. |
| `src/models/Subtask.ts` | `Subtask` | Rincian langkah kegiatan dengan atribut `title` dan `completed`. |
| `src/models/Activity.ts` | `Activity` | Entitas aktivitas, mencakup kategori `gamePlatform`, `courseName`, `routineFrequency`. |
| `src/models/FinanceTransaction.ts` | `FinanceTransaction` | Transaksi keuangan (pemasukan, pengeluaran, transfer). |
| `src/models/Account.ts` | `Account` | Rekening/dompet (Bank, E-Wallet, Cash) dan kalkulasi saldo. |
| `src/models/SmartEngine.ts` | `SmartEngine` | Mesin analisis offline (`calculateExecutiveSummary`, `calculateFinancialPulse`, `calculateHabitPulse`). |
| `src/models/index.ts` | Export Barrel | Titik ekspor untuk mempermudah `import { ... } from './models';`. |
