import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight,
  Sparkles,
  MapPin,
  Building,
  Bed,
  Utensils,
  Car,
  Percent
} from 'lucide-react';
import * as api from '../services/apiService';

export type MasterCategory = 
  | 'Destinations' 
  | 'Hotel Categories' 
  | 'Room Types' 
  | 'Meal Plans' 
  | 'Transport Modes' 
  | 'Tax Rates';

interface MasterItem {
  id: string;
  category: MasterCategory;
  name: string;
  code?: string;
  description?: string;
  is_enabled: number;
  sort_order: number;
  created_at?: string;
}

const CATEGORY_TABS: { key: MasterCategory; label: string; icon: React.ReactNode; placeholder: string; singular: string }[] = [
  { key: 'Destinations', label: 'Destinations', icon: <MapPin className="w-4 h-4" />, placeholder: 'e.g. Andaman, Kashmir, Dubai, Bali', singular: 'Destination' },
  { key: 'Hotel Categories', label: 'Hotel Categories', icon: <Building className="w-4 h-4" />, placeholder: 'e.g. 5 Star Luxury, Boutique Heritage', singular: 'Hotel Category' },
  { key: 'Room Types', label: 'Room Types', icon: <Bed className="w-4 h-4" />, placeholder: 'e.g. Deluxe Room, Pool Villa, Family Suite', singular: 'Room Type' },
  { key: 'Meal Plans', label: 'Meal Plans', icon: <Utensils className="w-4 h-4" />, placeholder: 'e.g. CP (Room + Breakfast), MAP (Breakfast + Dinner)', singular: 'Meal Plan' },
  { key: 'Transport Modes', label: 'Transport Modes', icon: <Car className="w-4 h-4" />, placeholder: 'e.g. Sedan (Dzire), SUV (Innova Crysta)', singular: 'Transport Mode' },
  { key: 'Tax Rates', label: 'Tax Rates', icon: <Percent className="w-4 h-4" />, placeholder: 'e.g. 5% GST Tour Package, 18% GST Service', singular: 'Tax Rate' },
];

export const MastersView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<MasterCategory>('Destinations');
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const loadMasters = async () => {
    setLoading(true);
    try {
      const data = await api.fetchMasters(activeCategory);
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching masters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasters();
  }, [activeCategory]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setIsAdding(true);
    try {
      const added = await api.addMasterItem({
        category: activeCategory,
        name: newItemName.trim(),
      });
      if (added) {
        setItems(prev => [...prev, added]);
        setNewItemName('');
      }
    } catch (err) {
      console.error('Error adding master item:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggle = async (item: MasterItem) => {
    const newStatus = item.is_enabled === 1 ? 0 : 1;
    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_enabled: newStatus } : i));
    try {
      await api.toggleMasterItem(item.id, newStatus === 1);
    } catch (err) {
      console.error('Error toggling master item:', err);
      loadMasters();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await api.deleteMasterItem(id);
    } catch (err) {
      console.error('Error deleting master item:', err);
      loadMasters();
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, name: editName.trim() } : i));
    setEditingId(null);
    try {
      await api.updateMasterItem(id, { name: editName.trim() });
    } catch (err) {
      console.error('Error updating master item:', err);
      loadMasters();
    }
  };

  const currentTabInfo = CATEGORY_TABS.find(t => t.key === activeCategory) || CATEGORY_TABS[0];

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center font-black">
            <Database className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white dark:text-white">Masters</h1>
        </div>
        <p className="text-xs text-slate-400 dark:text-zinc-400 max-w-3xl">
          Reference data used across leads, proposals, and pricing. Statuses stay fixed; these lists are yours to manage.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-900/80 dark:bg-[#161713] border border-zinc-800/80 dark:border-zinc-800 rounded-xl">
        {CATEGORY_TABS.map(tab => {
          const isActive = activeCategory === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveCategory(tab.key);
                setSearchQuery('');
                setEditingId(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive 
                  ? 'bg-lime-400 text-black shadow-sm font-bold' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Add New Item Bar */}
      <div className="bg-zinc-900/60 dark:bg-[#161713] border border-zinc-800/80 rounded-2xl p-4 md:p-5 space-y-3">
        <label className="block text-xs font-bold text-zinc-300">
          New {currentTabInfo.singular}<span className="text-lime-400 ml-0.5">*</span>
        </label>
        <form onSubmit={handleAddItem} className="flex gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            placeholder={currentTabInfo.placeholder}
            className="flex-1 bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30"
          />
          <button
            type="submit"
            disabled={!newItemName.trim() || isAdding}
            className="px-6 py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
          >
            {isAdding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </form>
      </div>

      {/* Search & Counter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-200">{filteredItems.length}</span> items in {currentTabInfo.label}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeCategory}...`}
            className="w-full bg-zinc-900/60 dark:bg-[#161713] border border-zinc-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-lime-400"
          />
        </div>
      </div>

      {/* Item List */}
      <div className="bg-zinc-900/40 dark:bg-[#161713]/80 border border-zinc-800/80 rounded-2xl divide-y divide-zinc-800/60 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-lime-400" /> Loading {activeCategory}...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-sm font-semibold text-zinc-400">No {activeCategory.toLowerCase()} found.</p>
            <p className="text-xs text-zinc-600">Type above to add your first {currentTabInfo.singular.toLowerCase()}.</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const isEditing = editingId === item.id;
            const isEnabled = item.is_enabled === 1;

            return (
              <div 
                key={item.id}
                className={`p-4 md:px-5 flex items-center justify-between gap-4 transition-colors ${
                  isEnabled ? 'hover:bg-zinc-800/30' : 'opacity-50 bg-zinc-950/40'
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      autoFocus
                      className="flex-1 bg-zinc-950 border border-lime-400 rounded-lg px-3 py-1.5 text-xs text-zinc-100 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(item.id)}
                      className="p-1.5 bg-lime-400 text-black rounded-lg hover:bg-lime-300 cursor-pointer"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1.5 bg-zinc-800 text-zinc-400 rounded-lg hover:text-zinc-200 cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`text-xs font-semibold truncate ${
                      isEnabled ? 'text-zinc-200' : 'text-zinc-500 line-through'
                    }`}>
                      {item.name}
                    </span>
                    {item.code && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {item.code}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(item.id);
                        setEditName(item.name);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg text-xs transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => handleToggle(item)}
                    className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      isEnabled 
                        ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' 
                        : 'text-lime-400 bg-lime-400/10 border border-lime-400/20'
                    }`}
                  >
                    {isEnabled ? 'Disable' : 'Enable'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id, item.name)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MastersView;
