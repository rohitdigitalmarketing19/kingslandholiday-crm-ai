import React from 'react';
import { 
  Search, 
  Plus, 
  FileUp, 
  Share2, 
  RotateCcw, 
  Menu
} from 'lucide-react';
import { TabType } from '../types';

interface HeaderProps {
  activeTab: TabType;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onOpenAddCustomer?: () => void;
  onOpenUploadVoucher: () => void;
  onOpenShareModal: () => void;
  onResetData: () => void;
  onToggleMobileMenu: () => void;
  pendingCount: number;
  upcomingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  searchTerm,
  setSearchTerm,
  onOpenUploadVoucher,
  onOpenShareModal,
  onResetData,
  onToggleMobileMenu,
  pendingCount,
}) => {
  if (activeTab === 'invoices') return null;

  const getTabTitle = (tab: TabType) => {
    switch (tab) {
      case 'customer':
        return { title: 'Converted Leads Operations Management', subtitle: 'Post-sales converted leads, bookings, and contact profiles' };
      case 'pending-vouchers':
        return { title: 'Pending Hotels Vouchers Desk', subtitle: 'Hotel vouchers awaiting supplier confirmation & upload' };
      case 'uploaded-vouchers':
        return { title: 'Uploaded Hotel Vouchers Library', subtitle: 'Verified hotel vouchers ready for customer delivery' };
      case 'upcoming-trips':
        return { title: 'Upcoming Trips & Pre-Trip Readiness', subtitle: 'Trips starting soon & pre-flight operational checklists' };
      case 'day-wise-trip':
        return { title: 'Day-Wise Trip Itinerary Tracker', subtitle: 'Interactive daily schedule, driver contacts, and itinerary manager' };
      case 'completed-trips':
        return { title: 'Completed Trips & Post-Travel Audit', subtitle: 'Finished customer journeys, reviews, and feedback records' };
      default:
        return { title: 'Operations Hub', subtitle: 'Converted leads post-sales operations' };
    }
  };

  const { title, subtitle } = getTabTitle(activeTab);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left Title & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{title}</h2>
              {pendingCount > 0 && activeTab !== 'pending-vouchers' && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-black border border-amber-200">
                  {pendingCount} Pending Vouchers
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Right Search & Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Global Search Input */}
          <div className="relative flex-1 sm:w-64 md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer, booking ID, hotel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Action Buttons */}
          <button
            onClick={onOpenShareModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
            title="Share Vouchers & Itinerary on WhatsApp / Email"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Instant Share</span>
          </button>

          <button
            onClick={onOpenUploadVoucher}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-all"
            title="Upload Hotel Voucher"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Upload Voucher</span>
          </button>

          <button
            onClick={onResetData}
            title="Reset Sample Operations Data"
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
