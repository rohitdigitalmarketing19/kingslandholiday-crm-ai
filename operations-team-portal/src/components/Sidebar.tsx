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
      label: '1. Converted Leads Module',
      shortLabel: 'Converted Leads',
      icon: Users,
      badge: customersCount,
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'pending-vouchers' as TabType,
      label: '2. Pending Hotels Vouchers',
      shortLabel: 'Pending Vouchers',
      icon: FileClock,
      badge: pendingVouchersCount,
      badgeColor: pendingVouchersCount > 0 ? 'bg-amber-500 text-white font-bold animate-pulse' : 'bg-slate-100 text-slate-600',
    },
    {
      id: 'uploaded-vouchers' as TabType,
      label: '3. Uploaded Hotel Vouchers',
      shortLabel: 'Uploaded Vouchers',
      icon: FileCheck2,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'upcoming-trips' as TabType,
      label: '4. Upcoming Trips',
      shortLabel: 'Upcoming Trips',
      icon: PlaneTakeoff,
      badge: upcomingTripsCount,
      badgeColor: upcomingTripsCount > 0 ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 text-slate-600',
    },
    {
      id: 'day-wise-trip' as TabType,
      label: '5. Day-Wise Trip',
      shortLabel: 'Day-Wise Trip',
      icon: CalendarDays,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'cab-logistics' as TabType,
      label: '6. Payment Management',
      shortLabel: 'Payment Management',
      icon: Car,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'completed-trips' as TabType,
      label: '7. Completed Trips',
      shortLabel: 'Completed Trips',
      icon: CheckCircle2,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'invoices' as TabType,
      label: '8. Invoices Desk',
      shortLabel: 'Invoices',
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
      fixed inset-y-0 left-0 z-40 w-72 bg-white text-slate-800 flex flex-col border-r border-slate-200 shadow-sm transition-transform duration-300 ease-in-out
      lg:static lg:translate-x-0
      ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Brand Header */}
      <div className="px-6 py-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-md text-white font-black">
            <Compass className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="font-black text-base text-slate-900 tracking-tight flex items-center gap-1.5 uppercase">
              Ops Desk <span className="text-[9px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-bold border border-indigo-100">Post-Sales</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer & Trip Operations</p>
          </div>
        </div>
      </div>

      {/* Role Badge */}
      <div className="mx-4 my-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Headphones className="w-4 h-4 text-indigo-600" />
          <span>Operations Desk</span>
        </div>
        <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-black border border-emerald-100">
          Active
        </span>
      </div>

      {/* Navigation Menu */}
      <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
        Operations Menu
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`
                w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs transition-all duration-150 group text-left
                ${isActive 
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-700'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== null && item.badge !== undefined && (
                <span className={`ml-2 px-2 py-0.5 text-[10px] rounded-full flex-shrink-0 font-black ${isActive ? 'bg-white/20 text-white' : item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Status Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-xs">
            <p className="font-bold text-slate-800">Operations Live Sync</p>
            <p className="text-[10px] font-medium text-slate-400">Database connected</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
