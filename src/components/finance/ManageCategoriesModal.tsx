import React, { useState } from 'react';
import { X, Plus, Trash2, Tag, TrendingUp, TrendingDown } from 'lucide-react';
import { FinanceCategoryMap } from '../../types.ts';
import { playTickSound } from '../../utils/audio.ts';

interface ManageCategoriesModalProps {
  categories: FinanceCategoryMap;
  setCategories: (cats: FinanceCategoryMap) => void;
  onClose: () => void;
}

export default function ManageCategoriesModal({ categories, setCategories, onClose }: ManageCategoriesModalProps) {
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense' | 'transfer'>('expense');

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    playTickSound();
    
    const newCats = { ...categories };
    if (!newCats[newCatType]) newCats[newCatType] = [];
    
    if (!newCats[newCatType].includes(newCatName.trim())) {
      newCats[newCatType] = [...newCats[newCatType], newCatName.trim()];
      setCategories(newCats);
    }
    setNewCatName('');
  };

  const handleDeleteCategory = (type: 'income' | 'expense' | 'transfer', name: string) => {
    playTickSound();
    const newCats = { ...categories };
    if (newCats[type]) {
      newCats[type] = newCats[type].filter(c => c !== name);
      setCategories(newCats);
    }
  };

  const getCatIcon = (type: string) => {
    switch (type) {
      case 'income': return <TrendingUp className="w-4 h-4" />;
      case 'expense': return <TrendingDown className="w-4 h-4" />;
      case 'transfer': default: return <Tag className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white">
          <h2 className="text-xl font-bold text-slate-800">Kelola Kategori</h2>
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
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value as any)}
              className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
            >
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
              <option value="transfer">Transfer</option>
            </select>
            <input 
              type="text"
              placeholder="Nama Kategori..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCatName.trim()}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pt-0 space-y-4 custom-scrollbar bg-slate-50">
          {(['expense', 'income', 'transfer'] as const).map(type => (
            <div key={type} className="space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">
                {type === 'income' ? 'Pemasukan' : type === 'expense' ? 'Pengeluaran' : 'Transfer'}
              </div>
              {(categories[type] || []).map(cat => (
                <div key={cat} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      type === 'income' ? 'bg-emerald-100 text-emerald-600' :
                      type === 'expense' ? 'bg-rose-100 text-rose-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {getCatIcon(type)}
                    </div>
                    <span className="font-bold text-slate-700">{cat}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteCategory(type, cat)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(!categories[type] || categories[type].length === 0) && (
                <div className="text-sm text-slate-400 italic">Belum ada kategori.</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
