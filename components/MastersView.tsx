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
          <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand-ink border border-brand-line/20 flex items-center justify-center font-semibold">
            <Database className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white dark:text-white">Masters</h1>
        </div>
        <p className="text-sm text-muted max-w-3xl">
          Reference data used across leads, proposals, and pricing. Statuses stay fixed; these lists are yours to manage.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-inverse/80 border border-line/80 rounded-xl">
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                isActive 
                  ? 'bg-brand text-on-brand shadow-sm font-bold' 
                  : 'text-muted hover:text-zinc-200 hover:bg-inverse/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Add New Item Bar */}
      <div className="bg-inverse/60 border border-line/80 rounded-xl p-4 md:p-5 space-y-3">
        <label className="block text-sm font-bold text-zinc-300">
          New {currentTabInfo.singular}<span className="text-brand-ink ml-0.5">*</span>
        </label>
        <form onSubmit={handleAddItem} className="flex gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            placeholder={currentTabInfo.placeholder}
            className="flex-1 bg-inverse/80 border border-line/80 focus:border-brand-line rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-secondary outline-none transition-all focus:ring-1 focus:ring-brand-line/30"
          />
          <button
            type="submit"
            disabled={!newItemName.trim() || isAdding}
            className="px-6 py-2.5 bg-brand hover:bg-brand text-on-brand font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
          >
            {isAdding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </form>
      </div>

      {/* Search & Counter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="font-semibold text-zinc-200">{filteredItems.length}</span> items in {currentTabInfo.label}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeCategory}...`}
            className="w-full bg-inverse/60 border border-line rounded-xl pl-9 pr-4 py-1.5 text-sm text-zinc-200 placeholder:text-secondary outline-none focus:border-brand-line"
          />
        </div>
      </div>

      {/* Item List */}
      <div className="bg-inverse/40 border border-line/80 rounded-xl divide-y divide-line/60 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-secondary text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-brand-ink" /> Loading {activeCategory}...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-sm font-semibold text-muted">No {activeCategory.toLowerCase()} found.</p>
            <p className="text-sm text-secondary">Type above to add your first {currentTabInfo.singular.toLowerCase()}.</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const isEditing = editingId === item.id;
            const isEnabled = item.is_enabled === 1;

            return (
              <div 
                key={item.id}
                className={`p-4 md:px-5 flex items-center justify-between gap-4 transition-colors ${
                  isEnabled ? 'hover:bg-inverse/30' : 'opacity-50 bg-inverse/40'
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      autoFocus
                      className="flex-1 bg-inverse border border-brand-line rounded-lg px-3 py-1.5 text-sm text-zinc-100 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(item.id)}
                      className="p-1.5 bg-brand text-on-brand rounded-lg hover:bg-brand cursor-pointer"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1.5 bg-inverse text-muted rounded-lg hover:text-zinc-200 cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`text-xs font-semibold truncate ${
                      isEnabled ? 'text-zinc-200' : 'text-secondary line-through'
                    }`}>
                      {item.name}
                    </span>
                    {item.code && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-inverse text-muted border border-line">
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
                      className="p-1.5 text-muted hover:text-zinc-200 hover:bg-inverse rounded-lg text-sm transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => handleToggle(item)}
                    className={`text-sm font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      isEnabled 
                        ? 'text-muted hover:text-zinc-200 hover:bg-inverse' 
                        : 'text-brand-ink bg-brand/10 border border-brand-line/20'
                    }`}
                  >
                    {isEnabled ? 'Disable' : 'Enable'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id, item.name)}
                    className="p-1.5 text-secondary hover:text-danger-ink hover:bg-danger-strong/10 rounded-lg transition-colors cursor-pointer"
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
