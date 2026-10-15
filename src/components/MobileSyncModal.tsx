import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone, CloudLightning, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { playTickSound } from '../utils/audio.ts';
import { AppUser } from '../services/apiClient.ts';

interface MobileSyncModalProps {
  currentUser: AppUser | null;
  onClose: () => void;
  onOpenAuth: () => void;
}

export default function MobileSyncModal({ currentUser, onClose, onOpenAuth }: MobileSyncModalProps) {
  const [currentUrl, setCurrentUrl] = useState('https://ais-dev.run.app');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Replace development URL with shared preview URL so it can be opened on other devices
      const url = window.location.href.replace('ais-dev-', 'ais-pre-');
      setCurrentUrl(url);
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="relative p-6 pb-4 bg-indigo-600 text-white">
          <button
            onClick={() => { playTickSound(); onClose(); }}
            className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          
          <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-3 backdrop-blur-md">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-1 tracking-tight">Lanjutkan di HP Anda</h2>
          <p className="text-indigo-100 text-sm font-medium leading-relaxed">
            Data Anda bisa diakses dari perangkat manapun dengan 3 langkah mudah.
          </p>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {!currentUser ? (
              <div className="flex gap-4">
                <div className="w-8 h-8 shrink-0 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm">1</div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Simpan Data ke Cloud</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">
                    Saat ini data Anda hanya tersimpan di browser ini. Buat akun gratis untuk mengamankan data Anda.
                  </p>
                  <button
                    onClick={() => { playTickSound(); onOpenAuth(); onClose(); }}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Daftar / Masuk Sekarang</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Data Tersimpan Aman</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Bagus! Data Anda sudah tersinkronisasi ke Cloud.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">2</div>
              <div className="w-full">
                <h3 className="text-sm font-bold text-slate-900 mb-1">Scan QR Code</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  Buka kamera HP Anda dan scan QR Code di bawah ini untuk membuka aplikasi.
                </p>
                <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-center border border-slate-100">
                  <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                    <QRCodeSVG value={currentUrl} size={160} level="M" includeMargin={false} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">3</div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Masuk di HP Anda</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Setelah terbuka di HP, {currentUser ? 'login dengan akun yang sama' : 'login dengan akun yang baru Anda buat'} dan semua catatan Anda akan otomatis muncul.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
