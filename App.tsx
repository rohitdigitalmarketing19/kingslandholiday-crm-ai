import SalesRepresentativePicker from './components/SalesRepresentativePicker';
import B2BDataView from './components/B2BDataView';
import { clearProposalPdfCache } from './services/proposalPdfService';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { applyTheme, readTheme, Theme } from './utils/theme';
import { Lead, Agent, LeadIntent, QuoteData, LeadNote } from './types';
import { analyzeLeadInquiry } from './services/geminiService';
import * as api from './services/apiService';
import LeadCard from './components/LeadCard';
import LeadDetails from './components/LeadDetails';
import GiveQuoteView from './components/GiveQuoteView';
import ItineraryLibrary from './components/ItineraryLibrary';
import LeadProposalView from './components/LeadProposalView';
import PaymentManagerModal, { PaymentTab } from './components/PaymentManagerModal';
import PaymentPageView from './components/PaymentPageView';
import { PublicClientDetailsView } from './components/PublicClientDetailsView';
import OperationsPortal from './operations-team-portal/src/App';
import FollowUpsView from './components/FollowUpsView';
import { AccountsView } from './components/AccountsView';
import { HotelVouchersView } from './components/HotelVouchersView';
import { UserManagementView } from './components/UserManagementView';
import SalesDeskView from './components/SalesDeskView';
import MastersView from './components/MastersView';
import HotelRatesView from './components/HotelRatesView';
import PdfDesignsView from './components/PdfDesignsView';
import PdfThemesView from './components/PdfThemesView';
import SettingsView from './components/SettingsView';
import { AdminClientHubView } from './components/AdminClientHubView';
import { LoginModal } from './components/LoginModal';
import { UserAccount, UserPermissionSection } from './types';
import { TabType } from './operations-team-portal/src/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { 
  LayoutDashboard, 
  Plus, 
  Users, 
  CreditCard, 
  Briefcase, 
  FileText, 
  Building2, 
  Wallet, 
  Map, 
  UserCog, 
  Shield, 
  Clock, 
  Search, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  CircleDot, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  Sparkles,
  Save,
  Send,
  SlidersHorizontal,
  Compass,
  RefreshCw,
  Sun,
  Moon,
  Database,
  Palette,
  Settings,
  Calendar,
  Users2,
  Camera,
  Upload,
  Edit2,
  Phone,
  Mail,
  FolderLock,
  UserCheck
} from 'lucide-react';

// NavItem props
interface NavItemProps {
  id: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: (id: any) => void;
  count?: number;
  isSubItem?: boolean;
  hasDropdown?: boolean;
  isOpen?: boolean;
  isExpert?: boolean;
  className?: string;
}

// NavItem component for sidebar — Executive Theme (High Contrast in Light & Dark Modes)
const NavItem: React.FC<NavItemProps> = ({ 
  id, 
  icon, 
  active, 
  onClick, 
  count, 
  isSubItem, 
  hasDropdown, 
  isOpen, 
  isExpert,
  className = ''
}) => (
  <button 
    aria-label={id}
    title={id}
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
      active && !isSubItem && !isExpert
        ? 'bg-brand text-on-brand dark:border shadow-xs font-bold' 
        : active && isSubItem
        ? 'bg-hover text-content font-bold'
        : isSubItem
        ? 'text-secondary hover:text-content hover:bg-subtle dark:hover:text-zinc-200 pl-9'
        : isExpert
        ? (active ? 'bg-brand text-on-brand font-bold' : 'text-content hover:bg-subtle hover:text-content dark:text-zinc-300 dark:hover:text-zinc-100')
        : 'text-content hover:bg-subtle hover:text-content dark:text-zinc-300 dark:hover:text-zinc-100'
    } ${className}`}
  >
    {icon && (
      <span 
        className={`flex-shrink-0 ${active && !isSubItem && !isExpert ? 'text-on-brand' : 'text-secondary'}`} 
        style={{ width: '18px', height: '18px' }}
      >
        {icon}
      </span>
    )}
    <span className="truncate flex-1 text-left">{id}</span>
    {count !== undefined && count >= 0 && (
      <span className={`ml-auto text-xs px-2 py-0.5 rounded font-semibold tabular-nums ${active && !isSubItem && !isExpert ? 'bg-white/20 text-on-brand' : 'bg-subtle text-secondary'}`}>
        {count}
      </span>
    )}
    {hasDropdown && (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={`h-3.5 w-3.5 transition-transform ml-auto ${isOpen ? 'rotate-180' : ''} ${active && !isSubItem ? 'text-on-brand' : 'text-muted'}`} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )}
  </button>
);

const App: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('kingsland_cached_leads');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (_) {}
    }
    return [];
  });
  const [agents, setAgents] = useState<Agent[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('kingsland_cached_agents');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (_) {}
    }
    return [];
  });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadTab, setSelectedLeadTab] = useState<'overview' | 'documents' | 'client_details'>('overview');
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeletingLead, setIsDeletingLead] = useState(false);
  const [toastNotification, setToastNotification] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = String(Date.now());
    setToastNotification({ id, message, type });
    setTimeout(() => {
      setToastNotification(prev => prev?.id === id ? null : prev);
    }, 3800);
  };

  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingInquiry, setIsSavingInquiry] = useState(false);
  const inquirySavingRef = useRef(false);
  const inquiryRequestRef = useRef<{fingerprint:string; id:string} | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // User & Permission Management State
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount>({
    id: 'usr-admin-1',
    name: 'Rohit (Admin)',
    email: 'rohit.digitalmarketing19@gmail.com',
    phone: '+91 6376983416',
    role: 'Admin',
    department: 'Management',
    status: 'Active',
    accessLevel: 'Editor',
    permissions: [
      'Dashboard',
      'Leads',
      'New Inquiry',
      'Follow-ups',
      'Saved Itinerary',
      'HotelVouchers',
      'Operations',
      'Payments',
      'Accounts',
      'Analytics',
      'Sales Team',
      'Sales Desk',
      'User Management'
    ],
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    createdAt: new Date().toISOString()
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => {
    return !localStorage.getItem('kingsland_active_user_id');
  });

  const handleLogout = async () => {
    await fetch('/api/users/logout',{method:'POST'}).catch(()=>{});
    localStorage.removeItem('kingsland_cached_leads'); localStorage.removeItem('kingsland_cached_agents');
    setLeads([]); setAgents([]);
    clearProposalPdfCache();
    localStorage.removeItem('kingsland_active_user_id');
    setIsLoginModalOpen(true);
  };

  useEffect(() => {
    fetch('/api/users/me').then(async response => {
      if (!response.ok) throw new Error('Session expired');
      const user=await response.json();setCurrentUser(user);localStorage.setItem('kingsland_active_user_id',user.id);setIsLoginModalOpen(false);
    }).catch(() => {localStorage.removeItem('kingsland_active_user_id');localStorage.removeItem('kingsland_cached_leads');localStorage.removeItem('kingsland_cached_agents');setLeads([]);setAgents([]);setIsLoginModalOpen(true);});
  }, []);
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === 'kingsland_theme') setTheme(readTheme());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  // Sidebar State - Persisted across reloads
  const [view, setViewState] = useState<
    'Dashboard' | 'Payments' | 'New Inquiry' | 'Leads' | 'Follow-ups' | 'Sales Desk' | 'Saved Itinerary' | 'Analytics' | 'Sales Team' | 'Operations' | 'HotelVouchers' | 'Accounts' | 'User Management' | 'Masters' | 'PDF designs' | 'PDF Themes' | 'Settings' | 'Client Documents' | 'Client Details' | 'Hotel Rates' | 'B2B Data'
  >(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kingsland_active_view');
      if(saved) return saved as any;
    }
    return 'Dashboard';
  });

  const setView = (newView: 'Dashboard' | 'Payments' | 'New Inquiry' | 'Leads' | 'Follow-ups' | 'Sales Desk' | 'Saved Itinerary' | 'Analytics' | 'Sales Team' | 'Operations' | 'HotelVouchers' | 'Accounts' | 'User Management' | 'Masters' | 'PDF designs' | 'PDF Themes' | 'Settings' | 'Client Documents' | 'Client Details' | 'Hotel Rates' | 'B2B Data') => {
    setViewState(newView);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kingsland_active_view', newView);
    }
  };

  const [isLeadsOpen, setIsLeadsOpen] = useState(false);
  const [isOpsOpen, setIsOpsOpen] = useState(false);
  
  const [opsTab, setOpsTabState] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kingsland_ops_tab');
      if (saved) return saved as any;
    }
    return 'customer';
  });

  const setOpsTab = (tab: TabType) => {
    setOpsTabState(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kingsland_ops_tab', tab);
    }
  };

  const [opsCounts, setOpsCounts] = useState({ customers: 6, pendingVouchers: 3, upcomingTrips: 3 });
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(false);
  
  const [paymentTab, setPaymentTabState] = useState<PaymentTab>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kingsland_payment_tab');
      if(saved==='Submissions')return 'Confirmation';
      if(saved && ['Dashboard','Completed','Links','Installments','Confirmation','CreateLink','Settings','Portal'].includes(saved))return saved as PaymentTab;
    }
    return 'Dashboard';
  });

  const setPaymentTab = (tab: PaymentTab) => {
    setPaymentTabState(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kingsland_payment_tab', tab);
    }
  };

  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 1024);

  const getClientDetailsTokenFromUrl = (): string | null => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname || '';
    const hash = window.location.hash || '';
    const pathMatch = path.match(/\/client-details\/([a-zA-Z0-9_-]+)/);
    if (pathMatch && pathMatch[1]) return pathMatch[1];
    const hashMatch = hash.match(/client-details\/([a-zA-Z0-9_-]+)/);
    if (hashMatch && hashMatch[1]) return hashMatch[1];
    if (path.includes('client-details') || hash.includes('client-details')) {
      const searchStr = window.location.search || (hash.includes('?') ? '?' + hash.split('?')[1] : '');
      const urlParams = new URLSearchParams(searchStr);
      const t = urlParams.get('token');
      if (t) return t;
    }
    return null;
  };

  const [isCustomerPaymentView, setIsCustomerPaymentView] = useState(() => typeof window !== 'undefined' && (window.location.hash.includes('payment') || window.location.pathname.includes('payment')));
  const [clientDetailsToken, setClientDetailsToken] = useState<string | null>(() => getClientDetailsTokenFromUrl());

  useEffect(() => {
    const handleHashCheck = () => {
      const isPay = window.location.hash.includes('payment') || window.location.pathname.includes('payment');
      setIsCustomerPaymentView(isPay);
      setClientDetailsToken(getClientDetailsTokenFromUrl());
    };
    window.addEventListener('hashchange', handleHashCheck);
    window.addEventListener('popstate', handleHashCheck);
    return () => {
      window.removeEventListener('hashchange', handleHashCheck);
      window.removeEventListener('popstate', handleHashCheck);
    };
  }, []);

  // Apply custom favicon if configured in Agency Settings
  useEffect(() => {
    api.fetchAgencySettings().then((settings) => {
      if (settings?.favicon_url && typeof document !== 'undefined') {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = settings.favicon_url;
      }
    }).catch(() => {});
  }, []);

  const [opsCustomersList, setOpsCustomersList] = useState<any[]>([]);

  // Fetch Users
  const fetchUsersList = useCallback(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setUsers(data);
          const savedUserId = localStorage.getItem('kingsland_active_user_id');
          const activeUser = savedUserId ? data.find((u: UserAccount) => u.id === savedUserId) : null;
          if (activeUser) {
            setCurrentUser(activeUser);
          } else {
            const admin = data.find((u: UserAccount) => u.email === 'rohit.digitalmarketing19@gmail.com' || u.role === 'Admin');
            if (admin) {
              setCurrentUser(admin);
              localStorage.setItem('kingsland_active_user_id', admin.id);
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchUsersList();
  }, [fetchUsersList]);

  // Check section access permissions for current logged-in user
  const hasAccess = useCallback((section: UserPermissionSection): boolean => {
    if (currentUser.role === 'Admin' || currentUser.email === 'rohit.digitalmarketing19@gmail.com') return true;
    return currentUser.permissions ? currentUser.permissions.includes(section) : false;
  }, [currentUser]);

  // User Management Actions
  const handleAddUserAccount = async (userData: Partial<UserAccount>) => {
    if (currentUser.accessLevel === 'ViewOnly') {
      alert('🚫 Access Restricted: You do not have permission to create user accounts. Your account is set to View-Only Mode.');
      return;
    }
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create user');
    }
    const newUser = await res.json();
    setUsers(prev => [newUser, ...prev]);
  };

  const handleUpdateUserAccount = async (id: string, userData: Partial<UserAccount>) => {
    if (currentUser.accessLevel === 'ViewOnly') {
      alert('🚫 Access Restricted: You do not have permission to update user accounts. Your account is set to View-Only Mode.');
      return;
    }
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update user');
    }
    const updated = await res.json();
    setUsers(prev => prev.map(u => u.id === id ? updated : u));
    if (currentUser.id === id) {
      setCurrentUser(updated);
    }
  };

  const handleDeleteUserAccount = async (id: string) => {
    if (currentUser.accessLevel === 'ViewOnly') {
      alert('🚫 Access Restricted: You do not have permission to delete user accounts. Your account is set to View-Only Mode.');
      return;
    }
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleSwitchUser = (_user: UserAccount) => {
    handleLogout();
  };

  useEffect(() => {
    fetch('/api/ops/customers').then(res => res.json()).then(data => {
      if (Array.isArray(data)) {
        setOpsCustomersList(data);
        setOpsCounts(prev => ({
          ...prev,
          customers: data.length,
          upcomingTrips: data.filter((c: any) => c.status === 'Upcoming').length,
        }));
      }
    }).catch(() => {});
    fetch('/api/ops/vouchers').then(res => res.json()).then(data => {
      if (Array.isArray(data)) {
        setOpsCounts(prev => ({
          ...prev,
          pendingVouchers: data.filter((v: any) => v.status === 'Pending').length,
        }));
      }
    }).catch(() => {});
  }, [view, opsTab]);

  const emiStats = useMemo(() => {
    let createdCount = 0;
    let createdAmount = 0;
    let dueCount = 0;
    let dueAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    let paidCount = 0;
    let paidAmount = 0;

    const overdueItems: any[] = [];
    const dueItems: any[] = [];

    opsCustomersList.forEach((cust: any) => {
      const installments = cust.installments || [];
      installments.forEach((inst: any) => {
        createdCount++;
        createdAmount += (inst.amount || 0);
        paidAmount += Number(inst.paidAmount ?? (inst.status==='Paid'?inst.amount:0));
        if (inst.status === 'Paid') {
          paidCount++;
        } else if (inst.status === 'Overdue') {
          overdueCount++;
          overdueAmount += Math.max(0,(inst.amount || 0)-(inst.paidAmount || 0));
          overdueItems.push({ ...inst, customerName: cust.name, bookingId: cust.bookingId });
        } else {
          dueCount++;
          dueAmount += Math.max(0,(inst.amount || 0)-(inst.paidAmount || 0));
          dueItems.push({ ...inst, customerName: cust.name, bookingId: cust.bookingId });
        }
      });
    });

    return {
      createdCount,
      createdAmount,
      dueCount,
      dueAmount,
      overdueCount,
      overdueAmount,
      paidCount,
      paidAmount,
      overdueItems,
      dueItems
    };
  }, [opsCustomersList]);
  
  // Dashboard & Multi-Criteria Filtering State
  const [dashboardFilter, setDashboardFilter] = useState<string | null>(null);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string | null>(null);
  const [filterDestination, setFilterDestination] = useState<string>('All');
  const [filterMonth, setFilterMonth] = useState<string>('All');
  const [filterSource, setFilterSource] = useState<string>('All');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Quoting state
  const [quotingLead, setQuotingLead] = useState<Lead | null>(null);
  const [editQuoteId, setEditQuoteId] = useState<string | null>(null);

  const [proposalLead, setProposalLead] = useState<Lead | null>(null);

  // Form State for Lead
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [formData, setFormData] = useState({
    tripId: '',
    name: '', phone: '', email: '', days: 10, nights: 9, travelDate: '',
    adults: 2, children: 0, childAges: [] as number[], destination: '',
    otherInfo: '', source: 'Google Ads', salesPersonId: '',
    includeStay: 'Yes', includeFlight: 'No', includeCab: 'Yes', hotelCategory: '4/3 Star',
    englishDriver: true
  });

  const [previewAnalysis, setPreviewAnalysis] = useState<Partial<Lead> | null>(null);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [agentFormData, setAgentFormData] = useState({
    name: '',
    specialty: '',
    avatar: '',
    phone: '',
    email: '',
  });

  const openAddAgentModal = () => {
    if (currentUser.role !== 'Admin') {
      alert('🚫 Access Restricted: Only Administrators can add sales representatives.');
      return;
    }
    if (currentUser.accessLevel === 'ViewOnly') {
      alert('🚫 Access Restricted: Your account is in View-Only mode.');
      return;
    }
    setEditingAgentId(null);
    setAgentFormData({ name: '', specialty: '', avatar: '', phone: '', email: '' });
    setIsAddingAgent(true);
  };

  const openEditAgentModal = (agent: Agent) => {
    if (currentUser.role !== 'Admin') {
      alert('🚫 Access Restricted: Only Administrators can edit sales representatives.');
      return;
    }
    if (currentUser.accessLevel === 'ViewOnly') {
      alert('🚫 Access Restricted: Your account is in View-Only mode.');
      return;
    }
    setEditingAgentId(agent.id);
    setAgentFormData({
      name: agent.name,
      specialty: Array.isArray(agent.specialty) ? agent.specialty.join(', ') : '',
      avatar: agent.avatar || '',
      phone: agent.phone || '',
      email: agent.email || '',
    });
    setIsAddingAgent(true);
  };

  // ============================
  // DATA FETCHING
  // ============================
  const loadLeads = useCallback(async () => {
    try {
      const data = await api.fetchLeads();
      const list = Array.isArray(data) ? data : [];
      setLeads(list);
      if (list.length > 0 && typeof window !== 'undefined') {
        try { localStorage.setItem('kingsland_cached_leads', JSON.stringify(list)); }
        catch { /* Browser cache is optional; retain the successful server response. */ }
      }
    } catch (err) {
      console.warn('⚠️ Server offline or API failed:', err);
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('kingsland_cached_leads');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setLeads(parsed);
              return;
            }
          } catch (_) {}
        }
      }
      setLeads([]);
    }
  }, []);

  const loadAgents = useCallback(async () => {
    try {
      const data = await api.fetchAgents();
      const list = Array.isArray(data) ? data : [];
      setAgents(list);
      if (list.length > 0 && typeof window !== 'undefined') {
        try { localStorage.setItem('kingsland_cached_agents', JSON.stringify(list)); }
        catch { /* Browser cache is optional; retain the successful server response. */ }
      }
    } catch (err) {
      console.warn('⚠️ Server offline or API failed:', err);
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('kingsland_cached_agents');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setAgents(parsed);
              return;
            }
          } catch (_) {}
        }
      }
      setAgents([]);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([loadLeads(), loadAgents()]);
      } catch (err) {
        console.error('Data loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();

    const handleHash = () => {
      const hash = window.location.hash || '';
      if (hash.includes('payment')) {
        setIsCustomerPaymentView(true);
        setView('Payments');
        setPaymentTab('Portal');
        setIsPaymentsOpen(true);
      } else {
        setIsCustomerPaymentView(false);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [loadLeads, loadAgents]);

  // Set default salesPersonId once agents are loaded
  useEffect(() => {
    if (agents.length > 0 && !formData.salesPersonId) {
      setFormData(prev => ({ ...prev, salesPersonId: agents[0].id }));
    }
  }, [agents]);

  const handleDayChange = (days: number) => {
    const d = Math.max(1, days);
    setFormData(prev => ({ ...prev, days: d, nights: d - 1 }));
  };

  const handleNightChange = (nights: number) => {
    const n = Math.max(0, nights);
    setFormData(prev => ({ ...prev, nights: n, days: n + 1 }));
  };

  const handleChildCountChange = (count: number) => {
    const val = Math.max(0, count);
    setFormData(prev => {
      const newChildAges = [...prev.childAges];
      if (val > prev.children) {
        for (let i = prev.children; i < val; i++) {
          newChildAges.push(5);
        }
      } else {
        newChildAges.splice(val);
      }
      return { ...prev, children: val, childAges: newChildAges };
    });
  };

  const filterCriteria = {
    'Active leads': (l: Lead) => ['New', 'Contacted', 'Qualified'].includes(l.status),
    'Update lead': (l: Lead) => l.status === 'Updated',
    'Hot Lead': (l: Lead) => l.status === 'Hot',
    'Postponed': (l: Lead) => l.status === 'Postponed',
    'In process': (l: Lead) => ['Itinerary Sent', 'Payment Pending'].includes(l.status),
    'Converted': (l: Lead) => l.status === 'Closed Won',
    'Cancel': (l: Lead) => l.status === 'Closed Lost',
  };

  const stats = useMemo(() => {
    return {
      active: leads.filter(filterCriteria['Active leads']).length,
      updated: leads.filter(filterCriteria['Update lead']).length,
      hot: leads.filter(filterCriteria['Hot Lead']).length,
      inProgress: leads.filter(filterCriteria['In process']).length,
      converted: leads.filter(filterCriteria['Converted']).length,
      cancel: leads.filter(filterCriteria['Cancel']).length,
      postponed: leads.filter(filterCriteria['Postponed']).length,
    };
  }, [leads]);

  const funnelData = useMemo(() => [
    { name: 'New', count: leads.filter(l => l.status === 'New').length },
    { name: 'Qualified', count: leads.filter(l => l.status === 'Qualified').length },
    { name: 'Itinerary Sent', count: leads.filter(l => l.status === 'Itinerary Sent').length },
    { name: 'Won', count: leads.filter(l => l.status === 'Closed Won').length },
  ], [leads]);

  const COLORS = ['var(--brand)', 'var(--success-ink)', 'var(--warning-ink)', 'var(--danger-ink)', 'var(--info-ink)'];

  const unquotedLeads = useMemo(() => {
    return leads.filter(l => l.status === 'New' && (!l.quotes || l.quotes.length === 0));
  }, [leads]);

  const uniqueDestinations = useMemo(() => {
    const set = new Set(leads.map(l => l.destination).filter(Boolean));
    return Array.from(set);
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const searchMatch = !globalSearch || 
        l.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
        l.destination.toLowerCase().includes(globalSearch.toLowerCase()) ||
        l.tripId.toLowerCase().includes(globalSearch.toLowerCase());
      
      let categoryMatch = true;
      if (dashboardFilter) {
        // @ts-ignore
        categoryMatch = filterCriteria[dashboardFilter]?.(l) || false;
      }

      const agentMatch = !selectedAgentFilter || l.assignedTo === selectedAgentFilter;
      const destMatch = filterDestination === 'All' || l.destination.toLowerCase() === filterDestination.toLowerCase();
      
      const dateToUse = (l.status === 'Postponed' && l.postponedDate) ? l.postponedDate : l.travelDate;
      const leadMonth = dateToUse ? (new Date(dateToUse).getMonth() + 1).toString().padStart(2, '0') : null;
      const monthMatch = filterMonth === 'All' || (leadMonth !== null && leadMonth === filterMonth);
      
      const sourceMatch = filterSource === 'All' || l.source === filterSource;

      return searchMatch && categoryMatch && agentMatch && destMatch && monthMatch && sourceMatch;
    });
  }, [leads, globalSearch, dashboardFilter, selectedAgentFilter, filterDestination, filterMonth, filterSource]);

  const handleAIAssessment = async () => {
    if (!formData.name || !formData.destination) {
      alert("Please fill in Name and Destination first.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeLeadInquiry({
        name: formData.name,
        destination: formData.destination,
        duration: formData.days,
        date: formData.travelDate,
        travelers: { adults: formData.adults, children: formData.children, childAges: formData.childAges },
        otherInfo: formData.otherInfo
      });
      setPreviewAnalysis(analysis);
    } catch (e) {
      console.error(e);
      setPreviewAnalysis({
        score: 85,
        intent: LeadIntent.HIGH,
        summary: `${formData.days}-day trip to ${formData.destination} for ${formData.adults} Adults${formData.children ? `, ${formData.children} Children` : ''}.`,
        budgetTier: 'Mid'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFinalizeInquiry = async (immediateQuote = false) => {
    if (inquirySavingRef.current) return;
    if (currentUser.accessLevel === 'ViewOnly') {
      alert('🚫 Access Restricted: You do not have permission to create inquiries. Your account is set to View-Only Mode.');
      return;
    }
    if (!formData.name || !formData.destination) {
      alert("Please fill in Name and Destination first.");
      return;
    }

    const analysis = previewAnalysis || {
      summary: `${formData.days}-day trip to ${formData.destination} for ${formData.adults} Adults${formData.children ? `, ${formData.children} Children` : ''}.`,
      score: 85,
      intent: 'High Intent',
      budgetTier: 'Mid'
    };

    inquirySavingRef.current = true;
    setIsSavingInquiry(true);
    try {
      const newLeadData = {
        tripId: formData.tripId.trim() ? formData.tripId.trim() : undefined,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        rawInquiry: `New lead for ${formData.destination}`,
        summary: analysis.summary || `Trip to ${formData.destination}`,
        score: analysis.score || 85,
        intent: analysis.intent || 'High Intent',
        destination: formData.destination,
        budgetTier: analysis.budgetTier || 'Mid',
        assignedTo: formData.salesPersonId || (agents[0]?.id || ''),
        source: formData.source,
        status: 'New',
        travelDate: formData.travelDate,
        durationDays: formData.days,
        travelers: { adults: formData.adults, children: formData.children, childAges: formData.childAges },
        otherInfo: formData.otherInfo,
        includeStay: formData.includeStay,
        includeFlight: formData.includeFlight,
        includeCab: formData.includeCab,
        hotelCategory: formData.hotelCategory,
        englishDriver: formData.englishDriver,
      };

      const fingerprint = JSON.stringify(newLeadData);
      if (inquiryRequestRef.current?.fingerprint !== fingerprint) {
        inquiryRequestRef.current = {fingerprint, id: crypto.randomUUID()};
      }
      const newLead = await api.createLead({...newLeadData, requestId: inquiryRequestRef.current.id});
      setLeads(previous => [newLead, ...previous.filter(lead => lead.id !== newLead.id)]);
      inquiryRequestRef.current = null;

      setFormData({ 
        tripId: '',
        name: '', phone: '', email: '', days: 10, nights: 9, travelDate: '', 
        adults: 2, children: 0, childAges: [], destination: '', otherInfo: '', 
        source: 'Website Form', salesPersonId: agents[0]?.id || '',
        includeStay: 'Yes', includeFlight: 'No', includeCab: 'Yes', 
        hotelCategory: '4/3 Star', englishDriver: true 
      });
      setIsCustomCategory(false);
      setPreviewAnalysis(null);

      alert(`✅ Lead for ${newLead.name} saved successfully!`);

      if (immediateQuote) {
        setQuotingLead(newLead);
        setEditQuoteId(null);
      }
    } catch (err) {
      console.error('Error creating lead:', err);
      alert(`Lead was not saved: ${(err as Error).message || 'An unexpected server error occurred. Please try again.'}`);
    } finally {
      inquirySavingRef.current = false;
      setIsSavingInquiry(false);
    }
  };

  const handleUpdateLeadStatus = async (
    leadId: string, 
    status: Lead['status'], 
    extraFields?: { 
      postponedDate?: string; 
      postponedReason?: string;
      followUpDate?: string;
      followUpTime?: string;
      followUpType?: string;
      followUpNote?: string;
      followUpCompleted?: boolean;
    }
  ) => {
    if (currentUser.accessLevel === 'ViewOnly') {
      alert('🚫 Access Restricted: You do not have permission to update lead status. Your account is set to View-Only Mode.');
      return;
    }
    try {
      await api.updateLeadStatus(leadId, status, extraFields);
      await loadLeads(); // Refresh leads
      // Update proposal view if open
      if (proposalLead && proposalLead.id === leadId) {
        const updated = await api.fetchLeadById(leadId);
        if (updated) setProposalLead(updated);
      }
    } catch (err) {
      console.warn('Error updating status on server:', err);
      alert((err as Error).message || 'The status was not saved.');
      await loadLeads();
    }
  };

  const handleAddNote = async (leadId: string, text: string, type: LeadNote['type']) => {
    if (currentUser.accessLevel === 'ViewOnly') {
      alert('🚫 Access Restricted: You do not have permission to add notes. Your account is set to View-Only Mode.');
      return;
    }
    try {
      await api.addNote(leadId, text, type);
      await loadLeads(); // Refresh leads
      // Update proposal view if open
      if (proposalLead && proposalLead.id === leadId) {
        const updated = await api.fetchLeadById(leadId);
        if (updated) setProposalLead(updated);
      }
    } catch (err) {
      console.error('Error adding note:', err);
      alert('Failed to add note.');
    }
  };

  const handleSaveQuote = async (quote: QuoteData) => {
    if (currentUser.accessLevel === 'ViewOnly') {
      alert('🚫 Access Restricted: You do not have permission to create or edit quotations. Your account is set to View-Only Mode.');
      return;
    }
    if (!quotingLead) return;
    try {
      const isUpdate = (quotingLead.quotes || []).some(q => q.id === quote.id);
      await api.saveQuote(quotingLead.id, quote, isUpdate);
      await loadLeads(); // Refresh leads
      setQuotingLead(null);
      setEditQuoteId(null);
      alert(`✅ Package Quotation "${quote.packageTitle || 'Proposal'}" saved successfully!`);
    } catch (err: any) {
      console.error('Error saving quote:', err);
      alert(`Failed to save quote: ${err.message || 'Server error'}`);
    }
  };

  const handleDeleteQuote = async (leadId: string, quoteId: string) => {
    if (currentUser.accessLevel === 'ViewOnly') {
      alert('🚫 Access Restricted: You do not have permission to delete quotations. Your account is set to View-Only Mode.');
      return;
    }
    try {
      await api.deleteQuote(leadId, quoteId);
      await loadLeads(); // Refresh leads
      // Update proposal view
      if (proposalLead && proposalLead.id === leadId) {
        const updated = await api.fetchLeadById(leadId);
        if (updated) setProposalLead(updated);
      }
    } catch (err) {
      console.error('Error deleting quote:', err);
      alert('Failed to delete quote.');
    }
  };

  const handleDeleteLead = (leadOrId: string | Lead) => {
    if (currentUser.accessLevel === 'ViewOnly') {
      showToast('Access Restricted: You do not have permission to delete leads (View-Only Mode).', 'error');
      return;
    }
    let targetLead: Lead | undefined;
    if (typeof leadOrId === 'string') {
      targetLead = leads.find(l => l.id === leadOrId || l.tripId === leadOrId);
    } else {
      targetLead = leadOrId;
    }
    if (!targetLead) {
      targetLead = leads.find(l => l.id === leadOrId) || ({ id: String(leadOrId), tripId: String(leadOrId), name: 'Lead Inquiry' } as any);
    }
    setLeadToDelete(targetLead || null);
  };

  const handleConfirmDeleteLead = async () => {
    if (!leadToDelete) return;
    const leadId = leadToDelete.id;
    const leadTripId = leadToDelete.tripId;
    const leadName = leadToDelete.name;

    setIsDeletingLead(true);
    try {
      await api.deleteLead(leadId);
      setLeads(prev => prev.filter(l => l.id !== leadId && l.tripId !== leadTripId));
      if (selectedLead?.id === leadId || selectedLead?.tripId === leadTripId) setSelectedLead(null);
      if (proposalLead?.id === leadId || proposalLead?.tripId === leadTripId) setProposalLead(null);
      if (quotingLead?.id === leadId || quotingLead?.tripId === leadTripId) setQuotingLead(null);
      showToast(`Lead #${leadTripId} (${leadName}) was deleted successfully.`, 'success');
    } catch (err) {
      console.warn('Backend delete lead note:', err);
      setLeads(prev => prev.filter(l => l.id !== leadId && l.tripId !== leadTripId));
      if (selectedLead?.id === leadId) setSelectedLead(null);
      if (proposalLead?.id === leadId) setProposalLead(null);
      if (quotingLead?.id === leadId) setQuotingLead(null);
      showToast(`Lead #${leadTripId} removed from active list.`, 'success');
    } finally {
      setIsDeletingLead(false);
      setLeadToDelete(null);
    }
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'Admin') {
      alert('🚫 Access Restricted: Only Administrators can add or edit sales representatives.');
      return;
    }
    if (currentUser.accessLevel === 'ViewOnly') {
      alert('🚫 Access Restricted: Your account is set to View-Only mode.');
      return;
    }
    if (!agentFormData.name.trim()) {
      alert('Please enter the full name.');
      return;
    }
    const specialtyArr = agentFormData.specialty
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      if (editingAgentId) {
        await api.updateAgent(editingAgentId, {
          name: agentFormData.name.trim(),
          specialty: specialtyArr,
          avatar: agentFormData.avatar,
          phone: agentFormData.phone.trim(),
          email: agentFormData.email.trim(),
        });
        showToast(`Sales representative "${agentFormData.name}" updated successfully!`, 'success');
      } else {
        const newAgent = await api.createAgent({
          name: agentFormData.name.trim(),
          specialty: specialtyArr,
          avatar: agentFormData.avatar,
          phone: agentFormData.phone.trim(),
          email: agentFormData.email.trim(),
        });
        showToast(`Sales representative "${newAgent.name}" added successfully!`, 'success');
        // Auto-select in current lead creation form
        setFormData(prev => ({ ...prev, salesPersonId: newAgent.id }));
      }
      await loadAgents();
      setAgentFormData({ name: '', specialty: '', avatar: '', phone: '', email: '' });
      setEditingAgentId(null);
      setIsAddingAgent(false);
    } catch (err: any) {
      console.error('Error saving agent:', err);
      alert(err.message || 'Failed to save sales representative.');
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (currentUser.role !== 'Admin') {
      alert('🚫 Access Restricted: Only Administrators can remove sales representatives.');
      setDeletingAgentId(null);
      return;
    }
    if (currentUser.accessLevel === 'ViewOnly') {
      alert('🚫 Access Restricted: Your account is set to View-Only mode.');
      setDeletingAgentId(null);
      return;
    }
    try {
      await api.deleteAgent(id);
      await loadAgents(); // Refresh agents
      setDeletingAgentId(null);
    } catch (err: any) {
      console.error('Error deleting agent:', err);
      alert(err.message || "Cannot delete agent with active lead assignments. Reassign leads first.");
      setDeletingAgentId(null);
    }
  };

  const formatDisplayDate = (d: string) => {
    if (!d) return 'TBA';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <div className="text-center space-y-4">
          <div className="bg-brand text-white w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-lg mx-auto">K</div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-content">Kingsland Holidays</h2>
            <p className="text-sm text-muted">Loading CRM...</p>
          </div>
          <div className="flex justify-center">
            <svg className="animate-spin h-5 w-5 text-brand-ink" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // Render Standalone Public Client Details View
  if (clientDetailsToken) {
    return <PublicClientDetailsView token={clientDetailsToken} />;
  }

  // Render Standalone Customer Payment View when accessing payment links
  if (isCustomerPaymentView) {
    return (
      <div className="min-h-screen w-screen overflow-y-auto bg-[#FDFBF7] text-slate-900 flex flex-col justify-between font-sans selection:bg-[#C9922A] selection:text-white custom-scrollbar scroll-smooth" style={{ colorScheme: 'light' }}>
        <PaymentPageView isStandalone={true} />
        
        {/* Customer Standalone Footer */}
        <footer className="bg-[#F4ECE1] border-t border-[#E8E1D5] py-6 text-center text-sm text-[#7A6C5B] font-medium">
          <div className="max-w-4xl mx-auto px-4 space-y-2">
            <div className="flex flex-wrap justify-center items-center gap-6 text-xs font-bold uppercase tracking-wider text-[#7B1D2A] border-b border-[#E3DAC8] pb-3">
              <span>🔒 256-Bit SSL Encrypted</span>
              <span>🛡️ PCI-DSS Level 1 Certified</span>
              <span>⚡ Instant Confirmation</span>
              <span>💳 Razorpay Gateway Partner</span>
            </div>
            <p className="pt-1">© {new Date().getFullYear()} Kingsland Holidays Services Pvt Ltd. All rights reserved.</p>
            <p className="text-xs text-[#8C7E6C]">Official Secure Payment Portal for Kingsland Holidays Clients worldwide.</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="crm-app flex h-screen overflow-hidden font-sans bg-canvas text-content">
      <aside data-collapsed={sidebarCollapsed} className={`crm-sidebar ${sidebarCollapsed ? 'w-16' : 'w-60'} bg-surface border-r border-line flex flex-col shrink-0 z-20 overflow-y-auto overflow-x-hidden custom-scrollbar sidebar-transition`}>
        <div className={`${sidebarCollapsed ? 'px-3 py-4' : 'px-4 py-5'}`}>
          {/* Logo */}
          <div className={`flex items-center gap-2.5 mb-6 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="bg-brand text-on-brand font-semibold w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 shadow-xs">
              K
            </div>
            {!sidebarCollapsed && (
              <div className="leading-tight">
                <h1 className="text-sm font-bold text-content dark:text-white tracking-tight">Kingsland</h1>
                <span className="text-xs text-muted font-medium">Holiday CRM</span>
              </div>
            )}
          </div>
          
          {/* Navigation */}
          {!sidebarCollapsed && <p className="text-xs font-semibold text-secondary uppercase tracking-wider px-3 mb-2">Main</p>}
          <div className="space-y-0.5 mb-4">
            {/* 1. Dashboard */}
            {hasAccess('Dashboard') && (
              <NavItem id="Dashboard" icon={<LayoutDashboard size={18} />} active={view === 'Dashboard'} onClick={() => { setView('Dashboard'); setDashboardFilter(null); setSelectedAgentFilter(null); }} />
            )}

            {/* 2. New Inquiry */}
            {hasAccess('New Inquiry') && (
              <NavItem id="New Inquiry" icon={<Plus size={18} />} active={view === 'New Inquiry'} onClick={() => { setView('New Inquiry'); setPreviewAnalysis(null); }} count={leads.filter(l => l.status === 'New').length} />
            )}
            
            {/* 3. All Leads */}
            {hasAccess('Leads') && (
              <>
                <NavItem 
                  id="All Leads" 
                  icon={<Users size={18} />} 
                  active={view === 'Leads' && !selectedAgentFilter} 
                  onClick={() => { setView('Leads'); setSelectedAgentFilter(null); setDashboardFilter(null); setIsLeadsOpen(!isLeadsOpen); }}
                  count={leads.length}
                  hasDropdown
                  isOpen={isLeadsOpen}
                />
                
                {isLeadsOpen && (
                  <div className="mt-0.5 space-y-0.5">
                    {Object.keys(filterCriteria).map((cat) => (
                      <NavItem 
                        key={cat} 
                        id={cat} 
                        active={view === 'Leads' && !selectedAgentFilter && dashboardFilter === cat} 
                        onClick={(id) => { setView('Leads'); setSelectedAgentFilter(null); setDashboardFilter(id); }} 
                        count={leads.filter((filterCriteria as any)[cat]).length}
                        isSubItem
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Follow-ups */}
            {hasAccess('Follow-ups') && (
              <NavItem 
                id="Follow-ups" 
                icon={<Clock size={18} />} 
                active={view === 'Follow-ups'} 
                onClick={() => { setView('Follow-ups'); setDashboardFilter(null); setSelectedAgentFilter(null); }}
                count={leads.filter((l) => (l.status === 'Follow-up' || Boolean(l.followUpDate)) && !l.followUpCompleted).length}
              />
            )}

            {/* Sales Desk */}
            {hasAccess('Sales Desk') && (
              <NavItem 
                id="Sales Desk" 
                icon={<Briefcase size={18} />} 
                active={view === 'Sales Desk'} 
                onClick={() => { setView('Sales Desk'); setDashboardFilter(null); setSelectedAgentFilter(null); }}
              />
            )}

            {/* Sales Team */}
            {(hasAccess('Sales Team') || hasAccess('Leads') || currentUser.role === 'Admin') && (
              <NavItem 
                id="Sales Team" 
                icon={<Users2 size={18} />} 
                active={view === 'Sales Team'} 
                onClick={() => { setView('Sales Team'); setDashboardFilter(null); setSelectedAgentFilter(null); }}
                count={agents.length}
              />
            )}
          </div>

          {/* FINANCE section */}
          {!sidebarCollapsed && (hasAccess('Payments') || hasAccess('Accounts')) && (
            <p className="text-xs font-semibold text-muted uppercase tracking-wider px-3 mb-2 mt-4">Finance</p>
          )}
          <div className="space-y-0.5 mb-4">
            {/* Payment Desk */}
            {hasAccess('Payments') && (
              <>
                <NavItem 
                  id="Payment Desk" 
                  icon={<CreditCard size={18} />} 
                  active={view === 'Payments'} 
                  onClick={() => { 
                    setView('Payments'); 
                    setIsPaymentsOpen(!isPaymentsOpen); 
                  }}
                  hasDropdown
                  isOpen={isPaymentsOpen}
                />

                {isPaymentsOpen && (
                  <div className="mt-0.5 space-y-0.5">
                    <NavItem 
                      id="Payment dashboard" active={view==='Payments' && paymentTab==='Dashboard'} onClick={()=>{setView('Payments');setPaymentTab('Dashboard');}} isSubItem />
                    <NavItem id="Completed payments" active={view==='Payments' && paymentTab==='Completed'} onClick={()=>{setView('Payments');setPaymentTab('Completed');}} isSubItem />
                    <NavItem id="Review payments" active={view==='Payments' && paymentTab==='Confirmation'} onClick={()=>{setView('Payments');setPaymentTab('Confirmation');}} isSubItem />
                    <NavItem id="Payment Links" 
                      active={view === 'Payments' && paymentTab === 'Links'} 
                      onClick={() => { setView('Payments'); setPaymentTab('Links'); }} 
                      isSubItem
                    />
                    <NavItem 
                      id="EMI & Installments" 
                      active={view === 'Payments' && paymentTab === 'Installments'} 
                      onClick={() => { setView('Payments'); setPaymentTab('Installments'); }} 
                      isSubItem
                    />
                    <NavItem 
                      id="Customer payment proofs" 
                      active={view === 'Payments' && paymentTab === 'Submissions'} 
                      onClick={() => { setView('Payments'); setPaymentTab('Submissions'); }} 
                      isSubItem
                    />
                    <NavItem 
                      id="Create Payment Link" 
                      active={view === 'Payments' && paymentTab === 'CreateLink'} 
                      onClick={() => { setView('Payments'); setPaymentTab('CreateLink'); }} 
                      isSubItem
                    />
                    <NavItem 
                      id="Payment Settings" 
                      active={view === 'Payments' && paymentTab === 'Settings'} 
                      onClick={() => { setView('Payments'); setPaymentTab('Settings'); }} 
                      isSubItem
                    />
                  </div>
                )}
              </>
            )}

            {/* Accounts Desk */}
            {hasAccess('Accounts') && (
              <NavItem 
                id="Accounts" 
                icon={<Wallet size={18} />} 
                active={view === 'Accounts'} 
                onClick={() => { setView('Accounts'); setDashboardFilter(null); setSelectedAgentFilter(null); }} 
                count={opsCustomersList.filter((c: any) => c.status === 'Completed').length || leads.filter(l => (l.status || '').toLowerCase() === 'completed').length}
              />
            )}
          </div>

          {/* OPERATIONS section */}
          {!sidebarCollapsed && (hasAccess('Operations') || hasAccess('HotelVouchers')) && (
            <p className="text-xs font-semibold text-muted uppercase tracking-wider px-3 mb-2 mt-4">Operations</p>
          )}
          <div className="space-y-0.5 mb-4">
            {/* Operations Desk */}
            {hasAccess('Operations') && (
              <>
                <NavItem 
                  id="Operations Desk" 
                  icon={<Briefcase size={18} />} 
                  active={view === 'Operations' && opsTab !== 'invoices'} 
                  onClick={() => { 
                    setView('Operations'); 
                    setIsOpsOpen(!isOpsOpen); 
                  }}
                  hasDropdown
                  isOpen={isOpsOpen}
                />

                {isOpsOpen && (
                  <div className="mt-0.5 space-y-0.5">
                    <NavItem 
                      id="Converted Leads" 
                      active={view === 'Operations' && opsTab === 'customer'} 
                      onClick={() => { setView('Operations'); setOpsTab('customer'); }} 
                      count={opsCounts.customers}
                      isSubItem
                    />
                    <NavItem 
                      id="Pending Vouchers" 
                      active={view === 'Operations' && opsTab === 'pending-vouchers'} 
                      onClick={() => { setView('Operations'); setOpsTab('pending-vouchers'); }} 
                      count={opsCounts.pendingVouchers}
                      isSubItem
                    />
                    <NavItem 
                      id="Uploaded Vouchers" 
                      active={view === 'Operations' && opsTab === 'uploaded-vouchers'} 
                      onClick={() => { setView('Operations'); setOpsTab('uploaded-vouchers'); }} 
                      isSubItem
                    />
                    <NavItem 
                      id="Upcoming Trips" 
                      active={view === 'Operations' && opsTab === 'upcoming-trips'} 
                      onClick={() => { setView('Operations'); setOpsTab('upcoming-trips'); }} 
                      count={opsCounts.upcomingTrips}
                      isSubItem
                    />
                    <NavItem 
                      id="Day-Wise Trip" 
                      active={view === 'Operations' && opsTab === 'day-wise-trip'} 
                      onClick={() => { setView('Operations'); setOpsTab('day-wise-trip'); }} 
                      isSubItem
                    />
                    <NavItem 
                      id="Payment Management" 
                      active={view === 'Operations' && opsTab === 'cab-logistics'} 
                      onClick={() => { setView('Operations'); setOpsTab('cab-logistics'); }} 
                      isSubItem
                    />
                    <NavItem 
                      id="Completed Trips" 
                      active={view === 'Operations' && opsTab === 'completed-trips'} 
                      onClick={() => { setView('Operations'); setOpsTab('completed-trips'); }} 
                      isSubItem
                    />
                  </div>
                )}
              </>
            )}

            {/* Invoices Desk */}
            {(hasAccess('Invoices') || hasAccess('Accounts') || hasAccess('Operations')) && (
              <NavItem 
                id="Invoices Desk" 
                icon={<FileText size={18} />} 
                active={view === 'Operations' && opsTab === 'invoices'} 
                onClick={() => { setView('Operations'); setOpsTab('invoices'); }} 
              />
            )}

            {/* Hotel Vouchers */}
            {hasAccess('HotelVouchers') && (
              <NavItem 
                id="Hotel Vouchers" 
                icon={<Building2 size={18} />} 
                active={view === 'HotelVouchers'} 
                onClick={() => { setView('HotelVouchers'); setDashboardFilter(null); setSelectedAgentFilter(null); }} 
                count={opsCounts.pendingVouchers}
              />
            )}
          </div>

          {/* ADMIN section */}
          {!sidebarCollapsed && (hasAccess('Saved Itinerary') || hasAccess('Sales Team') || hasAccess('User Management') || currentUser.role === 'Admin') && (
            <p className="text-xs font-semibold text-secondary uppercase tracking-wider px-3 mb-2 mt-4">Admin</p>
          )}
          <div className="space-y-0.5 mb-4">
            {currentUser.role === 'Admin' && <NavItem id="B2B Data" icon={<Users size={18} />} active={view === 'B2B Data'} onClick={() => setView('B2B Data')} />}
            {currentUser.role === 'Admin' && <NavItem id="Hotel Rates" icon={<Building2 size={18} />} active={view === 'Hotel Rates'} onClick={() => setView('Hotel Rates')} /> }
            {hasAccess('Saved Itinerary') && (
              <NavItem id="Templates" icon={<Map size={18} />} active={view === 'Saved Itinerary'} onClick={() => setView('Saved Itinerary')} />
            )}

            {(currentUser.role === 'Admin' || hasAccess('User Management')) && (
              <>
                <NavItem 
                  id="Client Documents" 
                  icon={<FolderLock size={18} />} 
                  active={view === 'Client Documents'} 
                  onClick={() => setView('Client Documents')} 
                  count={leads.filter(l => l.status === 'Closed Won').reduce((acc, l) => acc + (l.documentsCount || 0), 0)} 
                />
                <NavItem 
                  id="Client Details" 
                  icon={<UserCheck size={18} />} 
                  active={view === 'Client Details'} 
                  onClick={() => setView('Client Details')} 
                  count={leads.filter(l => l.status === 'Closed Won').length} 
                />
                <NavItem id="Masters" icon={<Database size={18} />} active={view === 'Masters'} onClick={() => setView('Masters')} />
                <NavItem id="PDF designs" icon={<FileText size={18} />} active={view === 'PDF designs'} onClick={() => setView('PDF designs')} />
                <NavItem id="PDF Themes" icon={<Sparkles size={18} />} active={view === 'PDF Themes'} onClick={() => setView('PDF Themes')} />
                <NavItem id="Users" icon={<Shield size={18} />} active={view === 'User Management'} onClick={() => setView('User Management')} />
              </>
            )}

            {(currentUser.role === 'Admin' || hasAccess('User Management') || hasAccess('Payments')) && (
              <NavItem id="Settings" icon={<Settings size={18} />} active={view === 'Settings'} onClick={() => setView('Settings')} />
            )}
          </div>

          {/* Sales Experts List */}
          {!sidebarCollapsed && !hasAccess('Accounts') && (hasAccess('Leads') || hasAccess('Sales Team') || currentUser.role === 'Admin') && (
            <div className="space-y-2 mt-4 pt-4 border-t border-line/80">
              <div className="flex items-center justify-between px-3">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Sales Experts</p>
                {currentUser.role === 'Admin' && currentUser.accessLevel !== 'ViewOnly' && (
                  <button 
                    onClick={() => openAddAgentModal()}
                    className="text-xs font-medium text-brand-ink hover:text-brand-ink flex items-center gap-1 hover:underline cursor-pointer"
                    title="Add new sales expert (Admin only)"
                  >
                    <Plus size={13} />
                    <span>Add</span>
                  </button>
                )}
              </div>
              <div className="space-y-0.5">
                {agents.map((agent) => {
                  const isAgentActive = selectedAgentFilter === agent.id;
                  const isExpanded = expandedAgentId === agent.id;
                  
                  return (
                    <div key={agent.id} className="space-y-0.5">
                      <NavItem 
                        id={agent.name} 
                        active={isAgentActive} 
                        onClick={() => { 
                          setView('Leads'); 
                          setSelectedAgentFilter(agent.id); 
                          setDashboardFilter(null);
                          setExpandedAgentId(isExpanded ? null : agent.id);
                        }} 
                        count={leads.filter(l => l.assignedTo === agent.id).length}
                        isExpert
                        hasDropdown
                        isOpen={isExpanded}
                      />
                      
                      {isExpanded && (
                        <div className="mt-0.5 space-y-0.5 border-l border-line ml-6 pl-1">
                          {Object.keys(filterCriteria).map((cat) => {
                            const agentCatCount = leads.filter(l => l.assignedTo === agent.id && (filterCriteria as any)[cat](l)).length;
                            return (
                              <NavItem 
                                key={cat} 
                                id={cat} 
                                active={isAgentActive && dashboardFilter === cat} 
                                onClick={(id) => { 
                                  setView('Leads'); 
                                  setSelectedAgentFilter(agent.id); 
                                  setDashboardFilter(id); 
                                }} 
                                count={agentCatCount}
                                isSubItem
                                className="!ml-0"
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer — User Profile, Theme Switcher & Collapse */}
        <div className="mt-auto border-t border-line p-3 bg-subtle/80 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-brand/20 border border-brand-line/30 text-brand-ink flex items-center justify-center font-semibold text-sm shrink-0 shadow-xs">
                {currentUser.name?.charAt(0) || 'A'}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-bold text-content dark:text-zinc-100 truncate">{currentUser.name}</p>
                  <span className="text-xs text-secondary font-semibold block">{currentUser.role || 'Admin'}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Dark / Light Mode Switcher */}
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 rounded-lg text-content dark:text-zinc-300 hover:text-content hover:bg-hover transition-colors cursor-pointer border border-transparent hover:border-line "
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-content dark:text-zinc-300 hover:text-danger-ink hover:bg-hover transition-colors cursor-pointer border border-transparent hover:border-line "
                title="Lock / Logout"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-content dark:text-zinc-300 hover:text-content dark:hover:text-white hover:bg-hover/90 transition-colors text-xs font-bold cursor-pointer border border-line/70 "
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-canvas relative overflow-hidden">
        <header className="h-14 bg-surface border-b border-line flex items-center justify-between px-5 shrink-0 sticky top-0 z-10 gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
             <h2 className="text-base font-semibold text-content truncate">{view}</h2>
             <div className="h-4 w-px bg-hover hidden sm:block"></div>
             
             <div className="relative flex-1 max-w-sm hidden md:block">
                <input type="text" placeholder="Search leads, trips, payments..." className="w-full bg-canvas border border-line rounded-xl px-3 pl-9 py-1.5 text-sm text-content dark:text-zinc-200 placeholder:text-muted outline-none focus:ring-1 focus:ring-brand-line/50 focus:border-brand-line transition-all" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted " />
             </div>
          </div>

          {/* User info & controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl border border-line bg-canvas ">
              <div className="w-6 h-6 rounded-lg bg-brand/10 text-brand-ink border border-brand-line/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-semibold text-content dark:text-zinc-300 leading-tight flex items-center gap-1.5">
                  <span>{currentUser.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-brand/10 text-brand-ink border border-brand-line/20">
                    {currentUser.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Dark / Light Toggle */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-muted hover:text-brand-ink hover:bg-subtle rounded-xl transition-colors cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Sign Out */}
            <button
              onClick={handleLogout}
              className="p-2 text-muted hover:text-danger-ink hover:bg-subtle rounded-xl transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar scroll-smooth">
          {view === 'Dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Dashboard Header */}
              <div className="flex justify-between items-center">
                 <div>
                    <h2 className="text-xl font-semibold text-content">Dashboard</h2>
                    <p className="text-sm text-secondary mt-0.5">Overview of your sales pipeline and payment status</p>
                 </div>
                 <button onClick={() => setView('New Inquiry')} className="px-4 py-2 bg-brand text-white rounded-lg font-medium text-sm hover:bg-brand transition-colors flex items-center gap-2">
                   <Plus size={16} />
                   New Inquiry
                 </button>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { label: 'Active Leads', filterKey: 'Active leads', count: stats.active, badgeClass: 'bg-subtle text-content border-line dark:text-zinc-200 ' },
                  { label: 'Update Lead', filterKey: 'Update lead', count: stats.updated, badgeClass: 'bg-subtle text-content border-line dark:text-zinc-200 ' },
                  { label: 'Hot Leads', filterKey: 'Hot Lead', count: stats.hot, badgeClass: 'bg-danger-soft text-danger-ink border-danger-line ' },
                  { label: 'In Process', filterKey: 'In process', count: stats.inProgress, badgeClass: 'bg-warning-soft text-warning-ink border-warning-line ' },
                  { label: 'Converted', filterKey: 'Converted', count: stats.converted, badgeClass: 'bg-brand-soft text-brand-ink border-brand-line ' },
                  { label: 'Cancelled', filterKey: 'Cancel', count: stats.cancel, badgeClass: 'bg-subtle text-secondary border-line ' },
                  { label: 'Postponed', filterKey: 'Postponed', count: stats.postponed, badgeClass: 'bg-subtle text-content border-line dark:text-zinc-300 ' },
                ].map((stat) => (
                  <button 
                    key={stat.label} 
                    onClick={() => { setView('Leads'); setDashboardFilter(stat.filterKey); }} 
                    className="bg-surface p-3.5 rounded-xl border border-line hover:border-brand-line/50 hover:shadow-xs transition-all text-left group cursor-pointer"
                  >
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md border inline-block mb-2.5 ${stat.badgeClass}`}>
                      {stat.label}
                    </span>
                    <p className="text-2xl font-bold text-content dark:text-zinc-100 tabular-nums group-hover:text-brand-ink transition-colors">
                      {stat.count}
                    </p>
                  </button>
                ))}
              </div>

              {/* EMI & Installments Tracker */}
              <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-line ">
                  <div>
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} className="text-muted " />
                      <h3 className="text-base font-semibold text-content dark:text-zinc-100">Payment & EMI Tracker</h3>
                    </div>
                    <p className="text-sm text-secondary mt-0.5 ml-7">EMI schedules, due dates, overdue alerts, and collected revenue</p>
                  </div>

                  <button
                    onClick={() => { setView('Payments'); setPaymentTab('Installments'); }}
                    className="px-3 py-1.5 rounded-lg bg-brand-soft hover:bg-brand-soft text-brand-ink font-medium text-sm transition-colors"
                  >
                    Open EMI Management →
                  </button>
                </div>

                {/* 4 Key EMI Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  
                  {/* Card 1: Total EMIs Created */}
                  <div className="px-4 py-3 rounded-lg bg-canvas border border-line space-y-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-secondary block">Total EMIs</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-semibold text-content dark:text-zinc-100 tabular-nums">{emiStats.createdCount}</span>
                      <span className="text-sm font-mono text-secondary tabular-nums">₹{emiStats.createdAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Card 2: EMIs Due */}
                  <div className="px-4 py-3 rounded-lg bg-warning-soft border border-warning-line space-y-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-warning-ink block">Due (Upcoming)</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-semibold text-warning-ink tabular-nums">{emiStats.dueCount}</span>
                      <span className="text-sm font-mono text-warning-ink tabular-nums">₹{emiStats.dueAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Card 3: EMIs Overdue */}
                  <div className="px-4 py-3 rounded-lg bg-danger-soft border border-danger-line space-y-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-danger-ink block flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-danger-strong "></span>
                      Overdue
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-semibold text-danger-ink tabular-nums">{emiStats.overdueCount}</span>
                      <span className="text-sm font-mono text-danger-ink tabular-nums">₹{emiStats.overdueAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Card 4: EMIs Collected */}
                  <div className="px-4 py-3 rounded-lg bg-success-soft border border-success-line space-y-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-success-ink block">Collected</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-semibold text-success-ink tabular-nums">{emiStats.paidCount}</span>
                      <span className="text-sm font-mono text-success-ink tabular-nums">₹{emiStats.paidAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                </div>

                {/* Overdue EMI Alerts */}
                {emiStats.overdueItems.length > 0 && (
                  <div className="p-3 rounded-lg bg-danger-soft border border-danger-line space-y-2 text-sm">
                    <h4 className="font-semibold text-danger-ink text-sm uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-danger-strong "></span>
                      Overdue EMI Alerts ({emiStats.overdueItems.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {emiStats.overdueItems.map((item: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-md bg-surface border border-danger-line flex items-center justify-between">
                          <div>
                            <p className="font-medium text-content dark:text-zinc-100 text-sm">{item.customerName}</p>
                            <p className="text-xs text-secondary ">{item.title} · Due: <strong className="text-danger-ink ">{item.dueDate}</strong></p>
                          </div>
                          <span className="font-mono font-semibold text-danger-ink text-sm tabular-nums">₹{item.amount?.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-surface p-5 rounded-xl border border-line h-[380px] flex flex-col">
                  <h3 className="text-sm font-semibold text-content dark:text-zinc-100 mb-4 pb-3 border-b border-line ">Conversion Pipeline</h3>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
                      <BarChart data={funnelData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 500, fill: 'var(--text-muted)' }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 500, fill: 'var(--text-muted)' }} />
                        <Tooltip cursor={{ fill: 'var(--surface-raised)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)', fontSize: '13px' }} />
                        <Bar dataKey="count" radius={[4, 4, 4, 4]} barSize={36}>{funnelData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-surface p-5 rounded-xl border border-line h-[380px] flex flex-col">
                  <h3 className="text-sm font-semibold text-content dark:text-zinc-100 mb-4 pb-3 border-b border-line ">Market Intent</h3>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
                      <PieChart>
                        <Pie data={[{ name: 'High Intent', value: leads.filter(l => l.intent === LeadIntent.HIGH).length }, { name: 'Info Seeking', value: leads.filter(l => l.intent === LeadIntent.INFO).length }, { name: 'Urgent', value: leads.filter(l => l.intent === LeadIntent.URGENT).length }]} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={4} dataKey="value">{COLORS.map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}</Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)', fontSize: '13px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-2">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-brand rounded-sm"></div><span className="text-sm text-secondary font-medium">High Intent</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-success-strong rounded-sm"></div><span className="text-sm text-secondary font-medium">Info Seeking</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-warning-strong rounded-sm"></div><span className="text-sm text-secondary font-medium">Urgent</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}


          {view === 'New Inquiry' && (
            <div className="max-w-4xl mx-auto animate-in fade-in duration-300 space-y-8">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-line ">
                  <div>
                    <h2 className="text-xl font-semibold text-content dark:text-zinc-100">New Inquiry Center</h2>
                    <p className="text-sm text-secondary mt-0.5">Register new travel inquiries, calculate AI intent score, and generate instant quotes.</p>
                  </div>
               </div>

               <div className="bg-surface p-6 rounded-xl border border-line shadow-xs space-y-6">
                  <h3 className="text-sm font-semibold text-content dark:text-zinc-100 pb-3 border-b border-line flex items-center gap-2">
                    <Plus size={16} className="text-brand-ink " />
                    <span>Inquiry Registration Form</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Trip ID (Auto / Custom)</label>
                      <input type="text" className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-content dark:text-zinc-100 font-mono font-medium outline-none focus:border-brand-line focus:bg-surface transition-all" value={formData.tripId} onChange={e => setFormData({...formData, tripId: e.target.value})} placeholder="Auto (Leaves format to Settings)" />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Lead Source</label>
                      <select className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-content dark:text-zinc-100 font-medium outline-none focus:border-brand-line focus:bg-surface transition-all cursor-pointer" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}>
                        <option value="Google Ads">Google Ads</option>
                        <option value="Meta Ads">Meta Ads</option>
                        <option value="Website">Website</option>
                        <option value="Reference">Reference</option>
                        <option value="Other">Other</option>
                        <option value="Repeated Client">Repeated Client</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Customer Full Name *</label>
                      <input type="text" required className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-content dark:text-zinc-100 font-medium outline-none focus:border-brand-line focus:bg-surface transition-all" placeholder="e.g. Rahul Sharma" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Phone / WhatsApp</label>
                      <input type="text" className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-content dark:text-zinc-100 font-medium outline-none focus:border-brand-line focus:bg-surface transition-all" placeholder="+91 00000 00000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Travel Destination *</label>
                      <input type="text" required className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-content dark:text-zinc-100 font-medium outline-none focus:border-brand-line focus:bg-surface transition-all" placeholder="e.g. Kashmir / Dubai / Bali" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Travel Date</label>
                      <div className="relative flex items-center">
                        <Calendar className="w-4 h-4 text-muted absolute left-3 pointer-events-none z-10" />
                        <input type="date" min={todayStr} className="w-full bg-canvas border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-content dark:text-zinc-100 font-medium outline-none focus:border-brand-line focus:bg-surface transition-all cursor-pointer" value={formData.travelDate} onChange={e => setFormData({...formData, travelDate: e.target.value})} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Duration (Days & Nights)</label>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-canvas border border-line rounded-lg flex items-center px-3 py-1.5">
                          <input type="number" min="1" className="w-full bg-transparent text-xs font-semibold outline-none" value={formData.days} onChange={e => handleDayChange(parseInt(e.target.value) || 0)} />
                          <span className="text-xs text-muted font-medium ml-1">Days</span>
                        </div>
                        <div className="flex-1 bg-canvas border border-line rounded-lg flex items-center px-3 py-1.5">
                          <input type="number" min="0" className="w-full bg-transparent text-xs font-semibold outline-none" value={formData.nights} onChange={e => handleNightChange(parseInt(e.target.value) || 0)} />
                          <span className="text-xs text-muted font-medium ml-1">Nights</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Travelers</label>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-canvas border border-line rounded-lg flex items-center px-3 py-1.5">
                          <input type="number" min="1" className="w-full bg-transparent text-xs font-semibold outline-none" value={formData.adults} onChange={e => setFormData({...formData, adults: parseInt(e.target.value) || 1})} />
                          <span className="text-xs text-muted font-medium ml-1">Adults</span>
                        </div>
                        <div className="flex-1 bg-canvas border border-line rounded-lg flex items-center px-3 py-1.5">
                          <input type="number" min="0" className="w-full bg-transparent text-xs font-semibold outline-none" value={formData.children} onChange={e => handleChildCountChange(parseInt(e.target.value) || 0)} />
                          <span className="text-xs text-muted font-medium ml-1">Children</span>
                        </div>
                      </div>
                    </div>

                    {formData.children > 0 && (
                      <div className="col-span-1 md:col-span-2 bg-brand-soft/40 p-3 rounded-lg border border-brand-line space-y-2">
                        <label className="block text-xs font-medium text-brand-ink ">Child Ages (for hotel / flight pricing)</label>
                        <div className="flex flex-wrap gap-2">
                          {formData.childAges.map((age, index) => (
                            <div key={index} className="flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-md border border-brand-line shadow-2xs">
                              <span className="text-sm text-secondary dark:text-zinc-300">Child {index + 1}:</span>
                              <input
                                type="number"
                                min="0"
                                max="17"
                                className="w-12 bg-canvas p-1 text-sm text-content dark:text-zinc-100 font-semibold rounded border border-line outline-none text-center"
                                value={age}
                                onChange={(e) => {
                                  const newAges = [...formData.childAges];
                                  newAges[index] = parseInt(e.target.value) || 0;
                                  setFormData({ ...formData, childAges: newAges });
                                }}
                              />
                              <span className="text-xs text-muted ">yrs</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-secondary ">Hotel Category</label>
                        <button
                          type="button"
                          onClick={() => setIsCustomCategory(!isCustomCategory)}
                          className="text-xs font-bold text-brand-ink hover:underline cursor-pointer"
                        >
                          {isCustomCategory ? 'Select from list' : '+ Type custom category'}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        {isCustomCategory ? (
                          <input
                            type="text"
                            autoFocus
                            placeholder="e.g. 5 Star Luxury, Boutique Heritage, Swiss Tent..."
                            className="flex-1 bg-canvas border border-brand-line rounded-lg px-3 py-2 text-sm text-content dark:text-zinc-100 font-medium outline-none focus:bg-surface "
                            value={formData.hotelCategory}
                            onChange={e => setFormData({ ...formData, hotelCategory: e.target.value })}
                          />
                        ) : (
                          <select
                            className="flex-1 bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-content dark:text-zinc-100 font-medium outline-none focus:border-brand-line focus:bg-surface "
                            value={['5 Star', '4 Star', '4/3 Star', '3 Star', 'Luxury Villa', 'Heritage Resort', 'Budget Stay'].includes(formData.hotelCategory) ? formData.hotelCategory : '__custom__'}
                            onChange={e => {
                              if (e.target.value === '__custom__') {
                                setIsCustomCategory(true);
                              } else {
                                setFormData({ ...formData, hotelCategory: e.target.value });
                              }
                            }}
                          >
                            <option value="5 Star">5 Star Luxury Resort</option>
                            <option value="4 Star">4 Star Premium Hotel</option>
                            <option value="4/3 Star">4/3 Star Comfort (Default)</option>
                            <option value="3 Star">3 Star Deluxe Hotel</option>
                            <option value="Luxury Villa">Luxury Private Villa</option>
                            <option value="Heritage Resort">Heritage / Boutique Hotel</option>
                            <option value="Budget Stay">Budget / Standard Hotel</option>
                            <option value="__custom__">✏️ + Custom (Type manually)...</option>
                          </select>
                        )}
                        <select className="w-28 bg-canvas border border-line rounded-lg px-2 py-2 text-sm text-content dark:text-zinc-100 font-medium outline-none" value={formData.includeStay} onChange={e => setFormData({...formData, includeStay: e.target.value})}>
                          <option value="Yes">Stay: Yes</option>
                          <option value="No">Stay: No</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">Transport Preferences</label>
                      <div className="flex gap-2">
                        <select className="flex-1 bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-content dark:text-zinc-100 font-medium outline-none focus:border-brand-line focus:bg-surface " value={formData.includeCab} onChange={e => setFormData({...formData, includeCab: e.target.value})}>
                          <option value="Yes">Private Cab: Included</option>
                          <option value="No">Private Cab: Excluded</option>
                        </select>
                        <select className="w-28 bg-canvas border border-line rounded-lg px-2 py-2 text-sm text-content dark:text-zinc-100 font-medium outline-none" value={formData.includeFlight} onChange={e => setFormData({...formData, includeFlight: e.target.value})}>
                          <option value="No">Flight: No</option>
                          <option value="Yes">Flight: Yes</option>
                        </select>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-medium text-secondary ">Special Notes & Requirements</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-sm font-medium text-secondary dark:text-zinc-300">
                          <input type="checkbox" checked={formData.englishDriver} onChange={e => setFormData({...formData, englishDriver: e.target.checked})} className="rounded text-brand-ink focus:ring-brand-line" />
                          <span>English-Speaking Driver</span>
                        </label>
                      </div>
                      <textarea rows={3} className="w-full bg-canvas border border-line rounded-lg p-3 text-sm text-content dark:text-zinc-100 font-medium outline-none focus:border-brand-line focus:bg-surface transition-all" placeholder="Enter special requests, dietary preferences, flight numbers, or budget notes..." value={formData.otherInfo} onChange={e => setFormData({...formData, otherInfo: e.target.value})}></textarea>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-secondary ">Assigned Sales Representative</label>
                      {currentUser.role === 'Admin' && currentUser.accessLevel !== 'ViewOnly' && (
                        <button
                          type="button"
                          onClick={() => openAddAgentModal()}
                          className="text-xs font-medium text-brand-ink hover:text-brand-ink flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Add New Representative</span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                       <SalesRepresentativePicker agents={agents} value={formData.salesPersonId} onChange={id=>setFormData(previous=>({...previous,salesPersonId:id}))}/>
                       {currentUser.role === 'Admin' && currentUser.accessLevel !== 'ViewOnly' && (
                         <button
                           type="button"
                           onClick={() => openAddAgentModal()}
                           className="p-2.5 rounded-lg border border-dashed border-line hover:border-brand-line hover:bg-brand-soft/50 text-secondary hover:text-brand-ink transition-all flex items-center justify-center gap-1.5 text-sm font-medium cursor-pointer"
                         >
                           <Plus size={14} />
                           <span>Add Person</span>
                         </button>
                       )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-line ">
                    <button
                      type="button"
                      disabled={isSavingInquiry}
                      aria-busy={isSavingInquiry}
                      onClick={() => handleFinalizeInquiry(false)}
                      className="flex-1 py-2.5 bg-surface border border-line text-content dark:text-zinc-300 rounded-lg font-medium text-sm hover:bg-canvas transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <Save size={14} className="text-secondary " />
                      <span>{isSavingInquiry ? 'Saving…' : 'Save Lead'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={handleAIAssessment}
                      className="flex-1 py-2.5 bg-inverse hover:bg-inverse text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw size={13} className="animate-spin text-white" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} className="text-brand-ink " />
                          <span>Preview AI Score</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isSavingInquiry}
                      aria-busy={isSavingInquiry}
                      onClick={() => handleFinalizeInquiry(true)}
                      className="flex-1 py-2.5 bg-brand hover:bg-brand text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <FileText size={14} />
                      <span>{isSavingInquiry ? 'Saving…' : 'Save & Give Quote'}</span>
                    </button>
                  </div>

                  {previewAnalysis && (
                    <div className="p-4 bg-brand-soft/60 rounded-xl border border-brand-line flex flex-col sm:flex-row items-center gap-5 animate-in fade-in duration-300">
                       <div className="text-center sm:text-left shrink-0">
                          <p className="text-xs font-semibold text-brand-ink uppercase tracking-wide">Intent Score</p>
                          <div className="flex items-center gap-2">
                             <span className="text-3xl font-bold text-brand-ink ">{previewAnalysis.score}</span>
                             <div className="flex flex-col text-left">
                                <span className="text-sm font-semibold text-brand-ink ">{previewAnalysis.intent}</span>
                                <span className="text-xs text-brand-ink font-medium">{previewAnalysis.budgetTier} Tier</span>
                             </div>
                          </div>
                       </div>
                       <div className="flex-1 border-t sm:border-t-0 sm:border-l border-brand-line sm:pl-5 pt-3 sm:pt-0">
                          <p className="text-xs font-semibold text-brand-ink uppercase tracking-wide mb-0.5">AI Summary</p>
                          <p className="text-sm text-brand-ink/90 dark:text-zinc-100 leading-relaxed font-medium italic">"{previewAnalysis.summary}"</p>
                       </div>
                    </div>
                  )}
               </div>

               <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-line ">
                     <h3 className="text-sm font-semibold text-content dark:text-zinc-100">Unquoted Inquiries</h3>
                     <span className="text-xs font-medium text-brand-ink bg-brand-soft px-2 py-0.5 rounded border border-brand-line ">
                        {unquotedLeads.length} Unquoted
                     </span>
                  </div>

                  <div className="space-y-3">
                     {unquotedLeads.length > 0 ? (
                       unquotedLeads.map((lead) => (
                         <LeadCard
                           key={lead.id}
                           lead={lead}
                           onClick={setQuotingLead}
                           onViewProposal={setProposalLead}
                           agentName={agents.find(a => a.id === lead.assignedTo)?.name}
                           showGiveQuote
                           displayIndex={unquotedLeads.length - unquotedLeads.indexOf(lead)}
                         />
                       ))
                     ) : (
                       <div className="py-12 text-center bg-surface rounded-xl border border-dashed border-line ">
                          <p className="text-muted text-sm font-medium">No unquoted leads currently.</p>
                       </div>
                     )}
                  </div>
               </div>
            </div>
          )}

          {view === 'Leads' && (
            <div className="space-y-5 animate-in fade-in duration-300">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-brand-ink uppercase tracking-wide">Analysis Pipeline</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-sm text-secondary font-medium">{filteredLeads.length} Inquiries</span>
                    </div>
                    <h2 className="text-xl font-semibold text-content">
                      {selectedAgentFilter ? `${agents.find(a => a.id === selectedAgentFilter)?.name}${dashboardFilter ? ` • ${dashboardFilter}` : ''}` : (dashboardFilter || 'Active Pipeline')}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                     <button onClick={() => setView('Operations')} className="px-3.5 py-2 bg-brand-soft hover:bg-brand-soft text-brand-ink border border-brand-line rounded-lg font-medium text-sm flex items-center gap-1.5 transition-colors cursor-pointer">
                       <Briefcase size={14} />
                       <span>Operations Desk</span>
                     </button>
                     <button onClick={() => setView('Payments')} className="px-3.5 py-2 bg-subtle hover:bg-hover text-content border border-line rounded-lg font-medium text-sm flex items-center gap-1.5 transition-colors cursor-pointer">
                       <CreditCard size={14} />
                       <span>Payments Desk</span>
                     </button>
                     <button onClick={() => setView('New Inquiry')} className="px-3.5 py-2 bg-brand hover:bg-brand text-white rounded-lg font-medium text-sm flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer">
                       <Plus size={14} />
                       <span>New Inquiry</span>
                     </button>
                  </div>
               </div>

               <div className="bg-surface p-3.5 rounded-xl border border-line shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 flex-1">
                     <div className="flex items-center gap-1.5 text-sm text-secondary dark:text-zinc-300">
                        <span className="text-xs font-medium text-secondary ">Destination:</span>
                        <select value={filterDestination} onChange={e => setFilterDestination(e.target.value)} className="bg-canvas border border-line rounded-lg px-2.5 py-1.5 text-sm text-content dark:text-zinc-100 font-medium outline-none focus:border-brand-line cursor-pointer">
                           <option value="All">All Destinations</option>
                           {uniqueDestinations.map(d => (<option key={d} value={d}>{d}</option>))}
                        </select>
                     </div>

                     <div className="flex items-center gap-1.5 text-sm text-secondary dark:text-zinc-300">
                        <span className="text-xs font-medium text-secondary ">Travel Month:</span>
                        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-canvas border border-line rounded-lg px-2.5 py-1.5 text-sm text-content dark:text-zinc-100 font-medium outline-none focus:border-brand-line cursor-pointer">
                           <option value="All">All Months</option>
                           <option value="01">January</option>
                           <option value="02">February</option>
                           <option value="03">March</option>
                           <option value="04">April</option>
                           <option value="05">May</option>
                           <option value="06">June</option>
                           <option value="07">July</option>
                           <option value="08">August</option>
                           <option value="09">September</option>
                           <option value="10">October</option>
                           <option value="11">November</option>
                           <option value="12">December</option>
                        </select>
                     </div>

                     <div className="flex items-center gap-1.5 text-sm text-secondary dark:text-zinc-300">
                        <span className="text-xs font-medium text-secondary ">Source:</span>
                        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="bg-canvas border border-line rounded-lg px-2.5 py-1.5 text-sm text-content dark:text-zinc-100 font-medium outline-none focus:border-brand-line cursor-pointer">
                           <option value="All">All Sources</option>
                           <option value="Google Ads">Google Ads</option>
                           <option value="Meta Ads">Meta Ads</option>
                           <option value="Website">Website</option>
                           <option value="Reference">Reference</option>
                           <option value="Other">Other</option>
                           <option value="Repeated Client">Repeated Client</option>
                        </select>
                     </div>
                  </div>

                  {(filterDestination !== 'All' || filterMonth !== 'All' || filterSource !== 'All') && (
                     <button onClick={() => { setFilterDestination('All'); setFilterMonth('All'); setFilterSource('All'); }} className="text-sm font-medium text-danger-ink hover:underline">
                        Reset Filters
                     </button>
                  )}
               </div>

               <div className="grid grid-cols-1 gap-2">
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map(lead => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onClick={setQuotingLead}
                        onViewProposal={setProposalLead}
                        onDeleteLead={handleDeleteLead}
                        onOpenLeadDetails={(lead, tab) => {
                          setSelectedLead(lead);
                          setSelectedLeadTab(tab || 'overview');
                        }}
                        agentName={agents.find(a => a.id === lead.assignedTo)?.name}
                        showGiveQuote
                      />
                    ))
                  ) : (
                    <div className="py-16 flex flex-col items-center justify-center text-center px-6 bg-surface border border-line rounded-xl shadow-xs">
                      <div className="w-10 h-10 bg-subtle rounded-lg flex items-center justify-center mb-3 text-muted ">
                        <Search size={18} />
                      </div>
                      <h4 className="text-sm font-semibold text-content dark:text-zinc-100 mb-1">No Matching Leads</h4>
                      <p className="text-sm text-muted max-w-sm font-medium">Adjust your filters or search keywords to find leads.</p>
                      <button onClick={() => { setGlobalSearch(''); setDashboardFilter(null); setSelectedAgentFilter(null); setFilterDestination('All'); setFilterMonth('All'); setFilterSource('All'); }} className="mt-3 text-sm font-medium text-brand-ink hover:underline">Clear all filters</button>
                    </div>
                  )}
               </div>
             </div>
          )}

          {view === 'Follow-ups' && (
             <div className="animate-in fade-in duration-500">
               <FollowUpsView
                 leads={leads}
                 agents={agents}
                 onOpenLead={(lead) => setProposalLead(lead)}
                 onCompleteFollowUp={async (leadId) => {
                   await handleUpdateLeadStatus(leadId, 'Follow-up', { followUpCompleted: true });
                 }}
               />
             </div>
           )}

          {view === 'Payments' && (
            <div className="animate-in fade-in duration-500">
              <PaymentManagerModal activeTab={paymentTab} onTabChange={setPaymentTab} isFullPage={true} />
            </div>
          )}
          {view === 'HotelVouchers' && (
            <div className="animate-in fade-in duration-500">
              <HotelVouchersView isReadOnly={currentUser.accessLevel === 'ViewOnly'} />
            </div>
          )}
          {view === 'Accounts' && (
            <div className="animate-in fade-in duration-500">
              <AccountsView
                leads={leads}
                isReadOnly={currentUser.accessLevel === 'ViewOnly'}
                onUpdateLead={(updated) => {
                  setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
                }}
                onViewProposal={(lead) => setProposalLead(lead)}
              />
            </div>
          )}
          {view === 'Saved Itinerary' && <ItineraryLibrary />}
          {view === 'Operations' && (
            <div className="animate-in fade-in duration-500">
              <OperationsPortal
                activeTab={opsTab}
                onTabChange={setOpsTab}
                hideSidebar={true}
                isReadOnly={currentUser.accessLevel === 'ViewOnly'}
              />
            </div>
          )}
          {view === 'Sales Team' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center pb-4 border-b border-line ">
                <div>
                  <h2 className="text-xl font-semibold text-content dark:text-zinc-100">Sales Representatives</h2>
                  <p className="text-sm text-secondary mt-0.5">Manage sales team members, assigned destinations, contact details, and pipeline metrics.</p>
                </div>
                {currentUser.role === 'Admin' && currentUser.accessLevel !== 'ViewOnly' && (
                  <button
                    onClick={() => openAddAgentModal()}
                    className="px-4 py-2 bg-brand hover:bg-brand text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Representative</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map(agent => (
                  <div key={agent.id} className="bg-surface p-5 rounded-xl border border-line shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-start gap-3 mb-3">
                        {agent.avatar ? (
                          <img 
                            src={agent.avatar} 
                            className="w-12 h-12 rounded-xl object-cover border border-line shrink-0 shadow-2xs" 
                            alt={agent.name}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-brand-soft text-brand-ink font-bold text-base flex items-center justify-center border border-brand-line shrink-0">
                            {agent.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-sm font-semibold text-content dark:text-zinc-100 truncate">{agent.name}</h4>
                            <span className="text-xs font-medium text-brand-ink bg-brand-soft px-1.5 py-0.5 rounded border border-brand-line shrink-0">Sales Expert</span>
                          </div>
                          {(agent.phone || agent.email) && (
                            <div className="mt-1 space-y-0.5 text-xs text-secondary ">
                              {agent.phone && (
                                <p className="flex items-center gap-1.5 truncate">
                                  <Phone size={11} className="text-muted shrink-0" />
                                  <span className="truncate">{agent.phone}</span>
                                </p>
                              )}
                              {agent.email && (
                                <p className="flex items-center gap-1.5 truncate">
                                  <Mail size={11} className="text-muted shrink-0" />
                                  <span className="truncate">{agent.email}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div>
                          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Destinations</p>
                          <div className="flex flex-wrap gap-1">
                            {agent.specialty && agent.specialty.length > 0 ? (
                              agent.specialty.map(s => (
                                <span key={s} className="px-2 py-0.5 bg-canvas text-secondary dark:text-zinc-300 text-xs font-medium rounded border border-line ">
                                  {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted italic">All Destinations</span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-canvas p-2.5 rounded-lg border border-line ">
                            <p className="text-xs text-secondary font-medium">Active Leads</p>
                            <p className="text-base font-semibold text-content dark:text-zinc-100">{leads.filter(l => l.assignedTo === agent.id).length}</p>
                          </div>
                          <div className="bg-success-soft/60 p-2.5 rounded-lg border border-success-line ">
                            <p className="text-xs text-success-ink font-medium">Conversion</p>
                            <p className="text-base font-semibold text-success-ink ">12%</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-line flex gap-2">
                      <button
                        onClick={() => { setView('Leads'); setSelectedAgentFilter(agent.id); }}
                        className="flex-1 py-2 bg-inverse hover:bg-inverse text-white rounded-lg font-medium text-sm transition-colors cursor-pointer text-center"
                      >
                        View Leads
                      </button>
                      {currentUser.role === 'Admin' && currentUser.accessLevel !== 'ViewOnly' && (
                        <>
                          <button 
                            onClick={() => openEditAgentModal(agent)} 
                            className="px-3 py-2 bg-subtle hover:bg-hover text-content border border-line rounded-lg font-medium text-sm transition-colors cursor-pointer flex items-center gap-1"
                            title="Edit representative (Admin only)"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                          <button 
                            onClick={() => setDeletingAgentId(agent.id)} 
                            className="px-3 py-2 bg-danger-soft hover:bg-danger-soft text-danger-ink border border-danger-line rounded-lg font-medium text-sm transition-colors cursor-pointer"
                            title="Remove representative (Admin only)"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {view === 'Sales Desk' && (
            <div className="animate-in fade-in duration-300">
              <SalesDeskView
                agents={agents}
                leads={leads}
                currentUser={currentUser}
                onSelectLead={(lead) => setSelectedLead(lead)}
                onViewProposal={(lead) => setProposalLead(lead)}
                onNewQuote={(lead) => { setQuotingLead(lead); setEditQuoteId(null); }}
                onUpdateLeadStatus={handleUpdateLeadStatus}
                onReassignLead={async (leadId, agentId) => {
                  try {
                    await api.reassignLead(leadId, agentId);
                    await loadLeads();
                    showToast('Lead reassigned successfully!', 'success');
                  } catch (err: any) {
                    showToast(err.message || 'Failed to reassign lead', 'error');
                  }
                }}
                onOpenAddAgent={() => openAddAgentModal()}
                onOpenNewInquiry={() => setView('New Inquiry')}
                isReadOnly={currentUser.accessLevel === 'ViewOnly'}
              />
            </div>
          )}
          {view === 'User Management' && (
            <div className="animate-in fade-in duration-500">
              <UserManagementView
                users={users}
                currentUser={currentUser}
                onAddUser={handleAddUserAccount}
                onUpdateUser={handleUpdateUserAccount}
                onDeleteUser={handleDeleteUserAccount}
                onSwitchUser={handleSwitchUser}
              />
            </div>
          )}
          {view === 'B2B Data' && currentUser.role === 'Admin' && <B2BDataView readOnly={currentUser.accessLevel === 'ViewOnly'} />}
          {view === 'Hotel Rates' && currentUser.role === 'Admin' && <HotelRatesView readOnly={currentUser.accessLevel === 'ViewOnly'} />}
          {view === 'Masters' && (
            <div className="animate-in fade-in duration-200">
              <MastersView />
            </div>
          )}
          {view === 'PDF designs' && (
            <div className="animate-in fade-in duration-200">
              <PdfDesignsView />
            </div>
          )}
          {view === 'PDF Themes' && (
            <div className="animate-in fade-in duration-200">
              <PdfThemesView />
            </div>
          )}
          {view === 'Settings' && (
            <div className="animate-in fade-in duration-200">
              <SettingsView />
            </div>
          )}
          {view === 'Client Documents' && (
            <div className="animate-in fade-in duration-200">
              <AdminClientHubView
                leads={leads}
                agents={agents}
                defaultTab="documents"
                onViewProposal={setProposalLead}
              />
            </div>
          )}
          {view === 'Client Details' && (
            <div className="animate-in fade-in duration-200">
              <AdminClientHubView
                leads={leads}
                agents={agents}
                defaultTab="client_details"
                onViewProposal={setProposalLead}
              />
            </div>
          )}
        </div>
      </main>


      {proposalLead && (<LeadProposalView lead={proposalLead} agentName={agents.find(a => a.id === proposalLead.assignedTo)?.name || 'Alex Thompson'} onClose={() => setProposalLead(null)} onUpdateStatus={handleUpdateLeadStatus} onAddNote={handleAddNote} onDeleteLead={handleDeleteLead} onEditQuote={(lead, qId) => { setQuotingLead(lead); setEditQuoteId(qId); setProposalLead(null); }} onNewQuote={(lead) => { setQuotingLead(lead); setEditQuoteId(null); setProposalLead(null); }} onDeleteQuote={(leadId, qId) => { handleDeleteQuote(leadId, qId); }} isReadOnly={currentUser.accessLevel === 'ViewOnly' || view === 'Accounts'} onUpdateLead={(updated) => { setProposalLead(updated); setLeads(leads.map(l => l.id === updated.id ? updated : l)); }} />)}
      {selectedLead && (<LeadDetails lead={selectedLead} initialTab={selectedLeadTab} agentName={agents.find(a => a.id === selectedLead.assignedTo)?.name || ''} onClose={() => { setSelectedLead(null); setSelectedLeadTab('overview'); }} onUpdateStatus={handleUpdateLeadStatus} onDeleteLead={handleDeleteLead} onUpdateLead={(updated) => { setSelectedLead(updated); setLeads(leads.map(l => l.id === updated.id ? updated : l)); }} />)}
      {quotingLead && (<GiveQuoteView lead={quotingLead} allLeads={leads} editQuoteId={editQuoteId} onClose={() => { setQuotingLead(null); setEditQuoteId(null); }} onSave={handleSaveQuote} />)}
      {/* ADD / EDIT SALES AGENT MODAL */}
      {isAddingAgent && currentUser.role === 'Admin' && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-inverse/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface rounded-xl shadow-sm w-full max-w-md p-6 border border-line animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line ">
              <div>
                <h3 className="text-base font-semibold text-content dark:text-zinc-100">
                  {editingAgentId ? 'Edit Sales Representative' : 'Add Sales Representative'}
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  {editingAgentId ? 'Update representative details, photo, and assigned destinations.' : 'Add a new sales team member with photo and specialties.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddingAgent(false);
                  setEditingAgentId(null);
                  setAgentFormData({ name: '', specialty: '', avatar: '', phone: '', email: '' });
                }}
                className="p-1.5 text-muted hover:text-secondary dark:hover:text-zinc-200 rounded-lg hover:bg-subtle transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddAgent} className="space-y-4">
              {/* Profile Photo Uploader */}
              <div className="p-3 bg-canvas rounded-xl border border-line/80 space-y-2.5">
                <label className="block text-xs font-semibold text-content dark:text-zinc-300 uppercase tracking-wider">
                  Profile Photo / Avatar
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    {agentFormData.avatar ? (
                      <img 
                        src={agentFormData.avatar} 
                        alt="Preview" 
                        className="w-16 h-16 rounded-xl object-cover border-2 border-brand-line shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-brand-soft text-brand-ink border-2 border-brand-line flex items-center justify-center font-bold text-xl">
                        {agentFormData.name ? agentFormData.name.charAt(0).toUpperCase() : <Users2 size={24} className="text-brand-ink " />}
                      </div>
                    )}
                    <label
                      htmlFor="agent-avatar-input"
                      className="absolute -bottom-1.5 -right-1.5 bg-brand hover:bg-brand text-white p-1.5 rounded-full shadow-sm cursor-pointer transition-all"
                      title="Upload photo"
                    >
                      <Camera size={12} />
                    </label>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      id="agent-avatar-input"
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 4 * 1024 * 1024) {
                            alert('Image size exceeds 4MB. Please select a smaller photo.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setAgentFormData(prev => ({ ...prev, avatar: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      <label
                        htmlFor="agent-avatar-input"
                        className="px-2.5 py-1.5 bg-surface border border-line hover:border-brand-line text-content dark:text-zinc-300 hover:text-brand-ink rounded-lg text-sm font-medium cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                      >
                        <Upload size={12} />
                        <span>Upload Photo</span>
                      </label>
                      {agentFormData.avatar && (
                        <button
                          type="button"
                          onClick={() => setAgentFormData(prev => ({ ...prev, avatar: '' }))}
                          className="px-2.5 py-1.5 bg-danger-soft hover:bg-danger-soft text-danger-ink border border-danger-line rounded-lg text-sm font-medium transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-secondary ">Supports PNG, JPG, WebP (up to 4MB)</p>
                  </div>
                </div>

                {/* Optional Image URL Input */}
                <div className="pt-1">
                  <input
                    type="url"
                    placeholder="Or paste image URL (https://...)"
                    value={agentFormData.avatar.startsWith('data:') ? '' : agentFormData.avatar}
                    onChange={(e) => setAgentFormData(prev => ({ ...prev, avatar: e.target.value }))}
                    className="w-full bg-surface border border-line rounded-lg px-2.5 py-1.5 text-sm text-content dark:text-zinc-100 outline-none focus:border-brand-line placeholder:text-muted "
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-content dark:text-zinc-300 mb-1">
                  Full Name <span className="text-danger-ink ">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={agentFormData.name}
                  onChange={e => setAgentFormData({...agentFormData, name: e.target.value})}
                  className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-content dark:text-zinc-100 font-medium outline-none focus:border-brand-line focus:bg-surface transition-all"
                />
              </div>

              {/* Contact Information (Phone & Email) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-content dark:text-zinc-300 mb-1 flex items-center gap-1">
                    <Phone size={11} className="text-muted " />
                    <span>Phone / WhatsApp</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={agentFormData.phone}
                    onChange={e => setAgentFormData({...agentFormData, phone: e.target.value})}
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-content dark:text-zinc-100 font-medium outline-none focus:border-brand-line focus:bg-surface transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-content dark:text-zinc-300 mb-1 flex items-center gap-1">
                    <Mail size={11} className="text-muted " />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. rahul@kingsland.com"
                    value={agentFormData.email}
                    onChange={e => setAgentFormData({...agentFormData, email: e.target.value})}
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-content dark:text-zinc-100 font-medium outline-none focus:border-brand-line focus:bg-surface transition-all"
                  />
                </div>
              </div>

              {/* Destinations / Specialties */}
              <div>
                <label className="block text-xs font-medium text-content dark:text-zinc-300 mb-1">
                  Assigned Destinations (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dubai, Bali, Kashmir, Rajasthan, Thailand"
                  value={agentFormData.specialty}
                  onChange={e => setAgentFormData({...agentFormData, specialty: e.target.value})}
                  className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-content dark:text-zinc-100 font-medium outline-none focus:border-brand-line focus:bg-surface transition-all"
                />
                <p className="text-xs text-muted mt-1">Separate multiple destinations with commas</p>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 pt-2 border-t border-line ">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingAgent(false);
                    setEditingAgentId(null);
                    setAgentFormData({ name: '', specialty: '', avatar: '', phone: '', email: '' });
                  }}
                  className="flex-1 py-2.5 bg-subtle hover:bg-hover text-content dark:text-zinc-300 text-sm font-medium rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand hover:bg-brand text-white text-sm font-medium rounded-xl transition-colors shadow-sm hover:shadow cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save size={13} />
                  <span>{editingAgentId ? 'Update Representative' : 'Save Representative'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEACTIVATE AGENT MODAL */}
      {deletingAgentId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-inverse/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface rounded-xl shadow-sm w-full max-w-sm p-6 border border-line animate-in zoom-in-95 duration-200 space-y-4 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-danger-soft border border-danger-line flex items-center justify-center text-danger-ink ">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-content dark:text-zinc-100">Remove Representative?</h3>
              <p className="text-sm text-secondary mt-1">This will remove this sales expert from the active assignment roster.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setDeletingAgentId(null)} className="flex-1 py-2 bg-subtle hover:bg-hover text-content dark:text-zinc-300 text-sm font-medium rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDeleteAgent(deletingAgentId)} className="flex-1 py-2 bg-danger-strong hover:bg-danger-strong text-white text-sm font-medium rounded-lg transition-colors shadow-xs">
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAD DELETE CONFIRMATION DIALOG */}
      {leadToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-inverse/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface rounded-xl shadow-sm w-full max-w-md p-6 border border-line space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-danger-soft border border-danger-line flex items-center justify-center text-danger-ink shrink-0 mt-0.5">
                <Trash2 size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-content dark:text-zinc-100">Delete Lead Inquiry?</h3>
                <p className="text-sm text-secondary mt-0.5">
                  This action cannot be undone. Please confirm you want to delete this lead.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isDeletingLead && setLeadToDelete(null)}
                className="p-1 text-muted hover:text-secondary dark:hover:text-zinc-200 rounded-md transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-canvas border border-line text-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-secondary font-medium">Inquiry ID:</span>
                <span className="font-mono font-semibold text-content dark:text-zinc-100 bg-surface px-2 py-0.5 rounded border border-line ">#{leadToDelete.tripId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary font-medium">Guest Name:</span>
                <span className="font-semibold text-content dark:text-zinc-100">{leadToDelete.name}</span>
              </div>
              {leadToDelete.destination && (
                <div className="flex items-center justify-between">
                  <span className="text-secondary font-medium">Destination:</span>
                  <span className="text-content dark:text-zinc-200 font-medium">{leadToDelete.destination}</span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-danger-soft/70 border border-danger-line/80 text-sm text-danger-ink flex items-start gap-2">
              <AlertTriangle size={15} className="text-danger-ink shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Deleting this inquiry will permanently remove all associated quotes, custom itinerary days, notes, follow-up schedules, and payment desk links.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line ">
              <button
                type="button"
                disabled={isDeletingLead}
                onClick={() => setLeadToDelete(null)}
                className="px-4 py-2 rounded-lg bg-subtle hover:bg-hover text-content dark:text-zinc-300 text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingLead}
                onClick={handleConfirmDeleteLead}
                className="px-4 py-2 rounded-lg bg-danger-strong hover:bg-danger-strong text-white text-sm font-medium transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isDeletingLead ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Yes, Delete Lead</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastNotification && (
        <div className={`fixed top-4 right-4 z-[200] flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-sm text-sm font-medium border animate-in slide-in-from-top-3 duration-200 max-w-md ${
          toastNotification.type === 'error'
            ? 'bg-danger-strong text-white border-danger-line'
            : toastNotification.type === 'info'
            ? 'bg-inverse text-white border-line'
            : 'bg-success-strong text-white border-success-line'
        }`}>
          {toastNotification.type === 'error' ? (
            <AlertTriangle size={16} className="text-danger-ink shrink-0" />
          ) : toastNotification.type === 'info' ? (
            <Clock size={16} className="text-slate-300 shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-success-ink shrink-0" />
          )}
          <span className="flex-1 leading-snug">{toastNotification.message}</span>
          <button 
            type="button"
            onClick={() => setToastNotification(null)}
            className="p-1 hover:bg-white/20 rounded transition-colors text-white/80"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* CRM LOGIN / LOCK SCREEN MODAL */}
      <LoginModal
        isOpen={isLoginModalOpen}
        users={users}
        onLoginSuccess={(user) => {
          clearProposalPdfCache();
          setCurrentUser(user);
          localStorage.setItem('kingsland_active_user_id', user.id);
          setIsLoginModalOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
};

export default App;
