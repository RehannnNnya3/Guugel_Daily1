import React, { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../lib/firebase.ts';
import { 
  FolderSync, 
  AlertCircle, 
  Laptop, 
  Smartphone, 
  CheckCircle,
  X,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSuccessSound, playTickSound } from '../utils/audio.ts';

interface AuthScreenProps {
  onClose?: () => void;
  onAuthSuccess?: () => void;
}

export default function AuthScreen({ onClose, onAuthSuccess }: AuthScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    playTickSound();
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      playSuccessSound();
      if (onAuthSuccess) onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login dibatalkan.');
      } else {
        setError('Gagal masuk. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 max-h-[90vh]"
      >
        {/* Left column: Marketing / Value prop */}
        <div className="md:col-span-5 bg-indigo-600 p-8 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-cyan-300 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-purple-400 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30">
                <FolderSync className="h-6 w-6 text-white" />
              </div>
              <span className="font-extrabold tracking-tight text-lg">SynchroDiary</span>
            </div>

            <h3 className="text-xl font-black leading-tight mb-4 tracking-tight">
              Satu Agenda, Sinkron di Semua Perangkat Anda!
            </h3>
            <p className="text-xs text-indigo-150 leading-relaxed mb-6 font-medium">
              Buat tugas di laptop saat kuliah atau bekerja, pantau dan selesaikan langsung dari smartphone Anda kapan saja, di mana saja.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-white/10 rounded-lg shrink-0 mt-0.5">
                  <Laptop className="h-4 w-4 text-indigo-200" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Sinkronisasi Real-Time</h4>
                  <p className="text-[10px] text-indigo-100 mt-0.5">Perubahan di laptop langsung muncul di HP dalam 1 detik.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-white/10 rounded-lg shrink-0 mt-0.5">
                  <Smartphone className="h-4 w-4 text-indigo-200" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Akses Multi-Device</h4>
                  <p className="text-[10px] text-indigo-100 mt-0.5">Gunakan akun yang sama di berbagai browser & HP secara bersamaan.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-white/10 rounded-lg shrink-0 mt-0.5">
                  <CheckCircle className="h-4 w-4 text-indigo-200" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Penyimpanan Aman di Cloud</h4>
                  <p className="text-[10px] text-indigo-100 mt-0.5">Tidak perlu khawatir kehilangan catatan jika cache browser dibersihkan.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-white/10 text-[10px] text-indigo-200 font-medium relative z-10 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
            Cloud Network Connected & Secure
          </div>
        </div>

        {/* Right column: Auth form */}
        <div className="md:col-span-7 p-8 flex flex-col justify-center bg-white relative">
          {onClose && (
            <button 
              onClick={() => { playTickSound(); onClose(); }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <div className="max-w-sm mx-auto w-full">
            <div className="mb-8 text-center">
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-3">
                Akses Cloud Gratis
              </span>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 mt-2">
                Selamat Datang Kembali
              </h2>
              <p className="text-sm text-slate-500 mt-2 font-medium">
                Masuk dengan akun Google Anda untuk melanjutkan sinkronisasi data.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 mb-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2 font-medium"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 active:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                    <path fill="none" d="M1 1h22v22H1z" />
                  </svg>
                  <span>Lanjutkan dengan Google</span>
                </>
              )}
            </button>
            
            <p className="text-center text-[10px] text-slate-400 mt-6 leading-relaxed">
              Dengan melanjutkan, Anda akan masuk ke akun Anda dengan aman menggunakan autentikasi Google.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
