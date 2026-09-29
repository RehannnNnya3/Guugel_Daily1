import React, { useState } from 'react';
import { X, Plus, Trash2, Wallet, Landmark, Smartphone } from 'lucide-react';
import { CustomAccount } from '../../types.ts';
import { playTickSound } from '../../utils/audio.ts';

interface ManageAccountsModalProps {
  accounts: CustomAccount[];
  setAccounts: (acc: CustomAccount[]) => void;
  onClose: () => void;
}

export default function ManageAccountsModal({ accounts, setAccounts, onClose }: ManageAccountsModalProps) {
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<'bank' | 'ewallet' | 'cash'>('bank');

  const handleAddAccount = () => {
    if (!newAccountName.trim()) return;
    playTickSound();
    const id = `custom_${Date.now()}`;
    const newAcc: CustomAccount = {
      id,
      name: newAccountName.trim(),
      type: newAccountType
    };
    setAccounts([...accounts, newAcc]);
    setNewAccountName('');
  };

  const handleDeleteAccount = (id: string) => {
    playTickSound();
    setAccounts(accounts.filter(a => a.id !== id));
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank': return <Landmark className="w-4 h-4" />;
      case 'ewallet': return <Smartphone className="w-4 h-4" />;
      case 'cash': default: return <Wallet className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white">
          <h2 className="text-xl font-bold text-slate-800">Kelola Rekening / Dompet</h2>
          <button 
            onClick={() => { playTickSound(); onClose(); }}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <select 
              value={newAccountType}
              onChange={(e) => setNewAccountType(e.target.value as any)}
              className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
            >
              <option value="bank">Bank</option>
              <option value="ewallet">E-Wallet</option>
              <option value="cash">Tunai</option>
            </select>
            <input 
              type="text"
              placeholder="Nama (ex: BCA, OVO)"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
            />
            <button
              onClick={handleAddAccount}
              disabled={!newAccountName.trim()}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pt-0 space-y-2 custom-scrollbar bg-slate-50">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 pt-4">Rekening Tersimpan</div>
          {accounts.map(acc => (
            <div key={acc.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  acc.type === 'bank' ? 'bg-blue-100 text-blue-600' :
                  acc.type === 'ewallet' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  {getAccountIcon(acc.type)}
                </div>
                <span className="font-bold text-slate-700">{acc.name}</span>
              </div>
              <button 
                onClick={() => handleDeleteAccount(acc.id)}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
