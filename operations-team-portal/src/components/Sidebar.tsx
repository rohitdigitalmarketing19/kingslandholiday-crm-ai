import React from 'react';
import { 
  Users, 
  FileClock, 
  FileCheck2, 
  PlaneTakeoff, 
  CalendarDays, 
  CheckCircle2, 
  Compass,
  Headphones,
  Receipt,
  Car
} from 'lucide-react';
import { TabType } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  pendingVouchersCount: number;
  upcomingTripsCount: number;
  customersCount: number;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingVouchersCount,
  upcomingTripsCount,
  customersCount,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const menuItems = [
    {
      id: 'customer' as TabType,
      label: 'Converted Leads',
      icon: Users,
      badge: customersCount,
      badgeColor: 'bg-subtle text-secondary',
    },
    {
      id: 'pending-vouchers' as TabType,
      label: 'Pending Vouchers',
      icon: FileClock,
      badge: pendingVouchersCount,
      badgeColor: pendingVouchersCount > 0 ? 'bg-warning-soft text-warning-ink font-semibold' : 'bg-subtle text-secondary',
    },
    {
      id: 'uploaded-vouchers' as TabType,
      label: 'Uploaded Vouchers',
      icon: FileCheck2,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'upcoming-trips' as TabType,
      label: 'Upcoming Trips',
      icon: PlaneTakeoff,
      badge: upcomingTripsCount,
      badgeColor: upcomingTripsCount > 0 ? 'bg-brand-soft text-brand-ink font-semibold' : 'bg-subtle text-secondary',
    },
    {
      id: 'day-wise-trip' as TabType,
      label: 'Day-Wise Trip',
      icon: CalendarDays,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'cab-logistics' as TabType,
      label: 'Payment Management',
      icon: Car,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'completed-trips' as TabType,
      label: 'Completed Trips',
      icon: CheckCircle2,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'invoices' as TabType,
      label: 'Invoices Desk',
      icon: Receipt,
      badge: null,
      badgeColor: '',
    },
  ];

  const handleSelect = (id: TabType) => {
    setActiveTab(id);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <aside className={`
 fixed inset-y-0 left-0 z-40 w-60 bg-surface text-content flex flex-col border-r border-line transition-transform duration-200 ease-in-out
 lg:static lg:translate-x-0
 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-line flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-inverse flex items-center justify-center shadow-sm">
          <Compass className="w-4 h-4 text-brand-ink" />
        </div>
        <div>
          <h1 className="font-semibold text-sm text-content tracking-tight flex items-center gap-1.5">
            Ops Desk <span className="text-xs px-1.5 py-px rounded bg-brand-soft text-brand-ink font-medium border border-brand-line">Post-Sales</span>
          </h1>
          <p className="text-xs font-medium text-muted">Customer & Trip Operations</p>
        </div>
      </div>

      {/* Role Badge */}
      <div className="mx-4 my-3 px-3 py-2 rounded-lg bg-canvas border border-line flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-secondary">
          <Headphones className="w-3.5 h-3.5 text-brand-ink" />
          <span>Operations Desk</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-success-soft text-success-ink font-medium border border-success-line">
          Active
        </span>
      </div>

      {/* Navigation Menu */}
      <div className="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wider">
        Operations Menu
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`
 w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-medium text-[13px] transition-all duration-150 group text-left
 ${isActive 
                  ? 'bg-brand-soft text-brand-ink border-l-2 border-brand-line -ml-px' 
                  : 'text-secondary hover:bg-canvas hover:text-content'}
              `}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-brand-ink' : 'text-muted group-hover:text-secondary'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== null && item.badge !== undefined && (
                <span className={`ml-2 px-1.5 py-0.5 text-xs rounded font-medium flex-shrink-0 tabular-nums ${isActive ? 'bg-brand-soft text-brand-ink' : item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Status Footer */}
      <div className="p-4 border-t border-line">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-success-strong" />
          <div className="text-xs">
            <p className="font-medium text-content">Live Sync Active</p>
            <p className="text-xs text-muted">Database connected</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
