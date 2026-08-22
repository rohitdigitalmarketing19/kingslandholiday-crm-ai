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
      badgeColor: 'bg-slate-100 text-slate-600',
    },
    {
      id: 'pending-vouchers' as TabType,
      label: 'Pending Vouchers',
      icon: FileClock,
      badge: pendingVouchersCount,
      badgeColor: pendingVouchersCount > 0 ? 'bg-amber-100 text-amber-700 font-semibold' : 'bg-slate-100 text-slate-600',
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
      badgeColor: upcomingTripsCount > 0 ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-slate-100 text-slate-600',
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
      fixed inset-y-0 left-0 z-40 w-60 bg-white text-slate-800 flex flex-col border-r border-slate-200 transition-transform duration-200 ease-in-out
      lg:static lg:translate-x-0
      ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-sm">
          <Compass className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <h1 className="font-semibold text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
            Ops Desk <span className="text-[9px] px-1.5 py-px rounded bg-indigo-50 text-indigo-600 font-medium border border-indigo-100">Post-Sales</span>
          </h1>
          <p className="text-[10px] font-medium text-slate-400">Customer & Trip Operations</p>
        </div>
      </div>

      {/* Role Badge */}
      <div className="mx-4 my-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <Headphones className="w-3.5 h-3.5 text-indigo-500" />
          <span>Operations Desk</span>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium border border-emerald-100">
          Active
        </span>
      </div>

      {/* Navigation Menu */}
      <div className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
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
                  ? 'bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600 -ml-px' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== null && item.badge !== undefined && (
                <span className={`ml-2 px-1.5 py-0.5 text-[10px] rounded font-medium flex-shrink-0 tabular-nums ${isActive ? 'bg-indigo-100 text-indigo-600' : item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Status Footer */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <div className="text-xs">
            <p className="font-medium text-slate-700">Live Sync Active</p>
            <p className="text-[10px] text-slate-400">Database connected</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
