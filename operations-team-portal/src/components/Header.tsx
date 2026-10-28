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
    <header className="bg-surface border-b border-line sticky top-0 z-30 shadow-xs">
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left Title & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-secondary hover:text-content hover:bg-subtle"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-content tracking-tighter uppercase">{title}</h2>
              {pendingCount > 0 && activeTab !== 'pending-vouchers' && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-warning-soft text-warning-ink font-semibold border border-warning-line">
                  {pendingCount} Pending Vouchers
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-muted mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Right Search & Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Global Search Input */}
          <div className="relative flex-1 sm:w-64 md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search customer, booking ID, hotel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-canvas border border-line rounded-xl text-content placeholder-muted font-bold focus:outline-none focus:ring-2 focus:ring-brand-line/20 focus:border-brand-line"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted hover:text-secondary"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Action Buttons */}
          <button
            onClick={onOpenShareModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-widest bg-success-soft text-success-ink border border-success-line hover:bg-success-soft transition-all"
            title="Share Vouchers & Itinerary on WhatsApp / Email"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Instant Share</span>
          </button>

          <button
            onClick={onOpenUploadVoucher}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-widest bg-warning-soft text-warning-ink border border-warning-line hover:bg-warning-soft transition-all"
            title="Upload Hotel Voucher"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Upload Voucher</span>
          </button>

          <button
            onClick={onResetData}
            title="Reset Sample Operations Data"
            className="p-2.5 rounded-xl text-muted hover:text-secondary hover:bg-subtle transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
