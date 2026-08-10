
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Lead, Agent, LeadIntent, QuoteData, LeadNote } from './types';
import { analyzeLeadInquiry } from './services/geminiService';
import * as api from './services/apiService';
import LeadCard from './components/LeadCard';
import LeadDetails from './components/LeadDetails';
import GiveQuoteView from './components/GiveQuoteView';
import ItineraryLibrary from './components/ItineraryLibrary';
import LeadProposalView from './components/LeadProposalView';
import PaymentManagerModal, { PaymentTab } from './components/PaymentManagerModal';
import OperationsPortal from './operations-team-portal/src/App';
import FollowUpsView from './components/FollowUpsView';
import { AccountsView } from './components/AccountsView';
import { HotelVouchersView } from './components/HotelVouchersView';
import { UserManagementView } from './components/UserManagementView';
import { LoginModal } from './components/LoginModal';
import { UserAccount, UserPermissionSection } from './types';
import { TabType } from './operations-team-portal/src/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

// Fix: Defining an interface for NavItem props to handle 'key' and other standard React attributes correctly.
interface NavItemProps {
  id: string;
  icon?: string;
  active: boolean;
  onClick: (id: any) => void;
  count?: number;
  isSubItem?: boolean;
  hasDropdown?: boolean;
  isOpen?: boolean;
  isExpert?: boolean;
  className?: string;
}

// NavItem component for sidebar
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
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition-all ${
      active && !isSubItem && !isExpert
        ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' 
        : active && isSubItem
        ? 'bg-indigo-50 text-indigo-600 font-bold'
        : isSubItem
        ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
    } ${className}`}
  >
    {icon && <span className="text-base">{icon}</span>}
    <span className="truncate">{id}</span>
    {count !== undefined && count >= 0 && (
      <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-black ${active && !isSubItem && !isExpert ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
        {count}
      </span>
    )}
    {hasDropdown && (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={`h-3.5 w-3.5 transition-transform ml-auto ${isOpen ? 'rotate-180' : ''} ${active ? 'text-white' : 'text-slate-400'}`} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" />
      </svg>
    )}
  </button>
);

const App: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
      'User Management'
    ],
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    createdAt: new Date().toISOString()
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => {
    return !localStorage.getItem('kingsland_active_user_id');
  });

  const handleLogout = () => {
    localStorage.removeItem('kingsland_active_user_id');
    setIsLoginModalOpen(true);
  };

  // Sidebar State
  const [view, setView] = useState<
    'Dashboard' | 'Payments' | 'New Inquiry' | 'Leads' | 'Follow-ups' | 'Saved Itinerary' | 'Analytics' | 'Sales Team' | 'Operations' | 'HotelVouchers' | 'Accounts' | 'User Management'
  >('Dashboard');
  const [isLeadsOpen, setIsLeadsOpen] = useState(false);
  const [isOpsOpen, setIsOpsOpen] = useState(false);
  const [opsTab, setOpsTab] = useState<TabType>('customer');
  const [opsCounts, setOpsCounts] = useState({ customers: 6, pendingVouchers: 3, upcomingTrips: 3 });
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(false);
  const [paymentTab, setPaymentTab] = useState<PaymentTab>('Links');
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

  const [isCustomerPaymentView, setIsCustomerPaymentView] = useState(() => window.location.hash.includes('payment'));

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
            if (admin) setCurrentUser(admin);
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

  const handleSwitchUser = (user: UserAccount) => {
    setCurrentUser(user);
    localStorage.setItem('kingsland_active_user_id', user.id);
    if (user.permissions && user.permissions.length > 0) {
      if (!user.permissions.includes(view as any) && user.role !== 'Admin') {
        const firstAllowed = user.permissions[0];
        setView(firstAllowed as any);
      }
    }
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
      let installments = cust.installments || [];
      if ((!installments || installments.length === 0) && (cust.totalAmount || cust.total_amount) > 0) {
        const tot = cust.totalAmount || cust.total_amount || 0;
        const inst1 = Math.round(tot * 0.3);
        const inst2 = Math.round(tot * 0.4);
        const inst3 = tot - inst1 - inst2;
        installments = [
          { title: '1st Installment - Token', amount: inst1, status: 'Paid', dueDate: cust.startDate || '' },
          { title: '2nd Installment - Hotel Lock', amount: inst2, status: 'Pending', dueDate: cust.startDate || '' },
          { title: '3rd Installment - Final Balance', amount: inst3, status: 'Pending', dueDate: cust.startDate || '' },
        ];
      }
      installments.forEach((inst: any) => {
        createdCount++;
        createdAmount += (inst.amount || 0);
        if (inst.status === 'Paid') {
          paidCount++;
          paidAmount += (inst.amount || 0);
        } else if (inst.status === 'Overdue') {
          overdueCount++;
          overdueAmount += (inst.amount || 0);
          overdueItems.push({ ...inst, customerName: cust.name, bookingId: cust.bookingId });
        } else {
          dueCount++;
          dueAmount += (inst.amount || 0);
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
  const [formData, setFormData] = useState({
    tripId: `KL-${Math.floor(1000 + Math.random() * 9000)}`,
    name: '', phone: '', email: '', days: 10, nights: 9, travelDate: '',
    adults: 2, children: 0, childAges: [] as number[], destination: '',
    otherInfo: '', source: 'Google Ads', salesPersonId: '',
    includeStay: 'Yes', includeFlight: 'No', includeCab: 'Yes', hotelCategory: '4/3 Star',
    englishDriver: true
  });

  const [previewAnalysis, setPreviewAnalysis] = useState<Partial<Lead> | null>(null);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [agentFormData, setAgentFormData] = useState({
    name: '', specialty: ''
  });

  // ============================
  // DATA FETCHING
  // ============================
  const loadLeads = useCallback(async () => {
    try {
      const data = await api.fetchLeads();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('⚠️ Server offline or API failed:', err);
      setLeads([]);
    }
  }, []);

  const loadAgents = useCallback(async () => {
    try {
      const data = await api.fetchAgents();
      setAgents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('⚠️ Server offline or API failed:', err);
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
        setLeads([]);
        setAgents([]);
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
    'Active leads': (l: Lead) => l.status === 'Qualified',
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

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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
      
      const leadMonth = l.travelDate ? (new Date(l.travelDate).getMonth() + 1).toString().padStart(2, '0') : null;
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

    try {
      const newLeadData = {
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

      const newLead = await api.createLead(newLeadData);
      await loadLeads(); // Refresh leads list

      setFormData({ 
        tripId: `KL-${Math.floor(1000 + Math.random() * 9000)}`,
        name: '', phone: '', email: '', days: 10, nights: 9, travelDate: '', 
        adults: 2, children: 0, childAges: [], destination: '', otherInfo: '', 
        source: 'Website Form', salesPersonId: agents[0]?.id || '',
        includeStay: 'Yes', includeFlight: 'No', includeCab: 'Yes', 
        hotelCategory: '4/3 Star', englishDriver: true 
      });
      setPreviewAnalysis(null);

      alert(`✅ Lead for ${newLead.name} saved successfully!`);

      if (immediateQuote) {
        setQuotingLead(newLead);
        setEditQuoteId(null);
      }
    } catch (err) {
      console.error('Error creating lead:', err);
      alert('Failed to save lead. Please check network connection.');
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
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status, ...(extraFields || {}) } as Lead : l));
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

  const handleDeleteLead = async (leadId: string) => {
    if (currentUser.accessLevel === 'ViewOnly') {
      alert('🚫 Access Restricted: You do not have permission to delete leads. Your account is set to View-Only Mode.');
      return;
    }
    setLeads(prev => prev.filter(l => l.id !== leadId));
    if (selectedLead?.id === leadId) setSelectedLead(null);
    if (proposalLead?.id === leadId) setProposalLead(null);
    if (quotingLead?.id === leadId) setQuotingLead(null);
    try {
      await api.deleteLead(leadId);
      alert('✅ Lead deleted successfully.');
    } catch (err) {
      console.warn('Backend delete lead notice:', err);
      alert('✅ Lead deleted from active list.');
    }
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAgent({
        name: agentFormData.name,
        specialty: agentFormData.specialty.split(',').map(s => s.trim()),
      });
      await loadAgents(); // Refresh agents
      setAgentFormData({ name: '', specialty: '' });
      setIsAddingAgent(false);
    } catch (err) {
      console.error('Error adding agent:', err);
      alert('Failed to add agent.');
    }
  };

  const handleDeleteAgent = async (id: string) => {
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
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-6">
          <div className="bg-slate-900 text-white w-16 h-16 rounded-2xl flex items-center justify-center font-black text-3xl shadow-2xl mx-auto">K</div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Kingsland Holidays</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Initializing CRM System...</p>
          </div>
          <div className="flex justify-center">
            <svg className="animate-spin h-8 w-8 text-indigo-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // Render Standalone Customer Payment View when accessing payment links
  if (isCustomerPaymentView) {
    return (
      <div className="h-screen w-screen overflow-y-auto bg-[#FDFBF7] text-slate-900 flex flex-col justify-between font-sans selection:bg-[#C9922A] selection:text-white custom-scrollbar scroll-smooth relative">
        
        {/* Ambient Warm Golden & Luxury Cream Radial Glows */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(224,201,144,0.35),transparent_70%)]"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_bottom_left,rgba(123,29,42,0.08),transparent_70%)]"></div>
          <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_right,rgba(201,146,42,0.1),transparent_70%)]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(123,29,42,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(123,29,42,0.02)_1px,transparent_1px)] bg-[size:36px_36px]"></div>
        </div>

        {/* Customer Standalone Branded Header */}
        <header className="bg-white/90 backdrop-blur-xl border-b border-[#E8E1D5] px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md relative">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-[#7B1D2A] via-[#63141F] to-[#450C14] text-white w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-[#7B1D2A]/20 border border-[#E0C990]/40 ring-4 ring-[#C9922A]/10">
              💳
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-[#7B1D2A] uppercase leading-none font-serif">KINGSLAND HOLIDAYS</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  PCI-DSS Level 1
                </span>
              </div>
              <span className="text-[10px] text-[#A67C1E] font-extrabold uppercase tracking-widest block mt-1">Official Secure Payment Desk</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-6 text-right text-xs">
            <div className="border-r border-[#E8E1D5] pr-6">
              <span className="text-[9px] font-black text-[#7B1D2A] uppercase tracking-widest block">24x7 Customer Desk</span>
              <p className="font-bold text-slate-800 font-mono text-[11px]">+91 6376983416</p>
            </div>
            <div>
              <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest block">SSL Encrypted</span>
              <p className="text-slate-600 text-[11px]">official.kingslandholidays@gmail.com</p>
            </div>
          </div>
        </header>

        {/* Customer Standalone Payment Container */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 my-6 relative z-10">
          <div className="bg-white border-2 border-[#E8E1D5] rounded-[2.5rem] p-3 md:p-6 shadow-2xl shadow-[#7B1D2A]/5">
            <PaymentManagerModal activeTab="Portal" isFullPage={false} />
          </div>
        </main>

        {/* Customer Standalone Footer */}
        <footer className="bg-[#F4ECE1] border-t border-[#E8E1D5] py-8 text-center text-xs text-[#7A6C5B] font-medium relative z-10">
          <div className="max-w-4xl mx-auto px-4 space-y-3">
            <div className="flex flex-wrap justify-center items-center gap-6 text-[10px] font-bold uppercase tracking-wider text-[#7B1D2A] border-b border-[#E3DAC8] pb-4">
              <span>🔒 256-Bit SSL Encrypted</span>
              <span>🛡️ PCI-DSS Level 1 Certified</span>
              <span>⚡ Instant Confirmation</span>
              <span>💳 Razorpay Gateway Partner</span>
            </div>
            <p className="pt-1">© {new Date().getFullYear()} Kingsland Holidays Services Pvt Ltd. All rights reserved.</p>
            <p className="text-[10px] text-[#8C7E6C]">Official Payment Portal for Kingsland Holidays Clients worldwide.</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 shadow-sm overflow-y-auto custom-scrollbar">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shadow-lg border border-slate-700">K</div>
            <h1 className="text-xl font-black tracking-tighter text-slate-800 uppercase leading-none">Kingsland<br/><span className="text-[10px] text-slate-400 tracking-[0.3em]">Holiday CRM</span></h1>
          </div>
          
          <div className="space-y-1 mb-10">
            {/* 1. Dashboard */}
            {hasAccess('Dashboard') && (
              <NavItem id="Dashboard" icon="📊" active={view === 'Dashboard'} onClick={() => { setView('Dashboard'); setDashboardFilter(null); setSelectedAgentFilter(null); }} />
            )}

            {/* 2. New Inquiry */}
            {hasAccess('New Inquiry') && (
              <NavItem id="New Inquiry" icon="✨" active={view === 'New Inquiry'} onClick={() => { setView('New Inquiry'); setPreviewAnalysis(null); }} count={leads.filter(l => l.status === 'New').length} />
            )}
            
            {/* 3. All Leads */}
            {hasAccess('Leads') && (
              <>
                <NavItem 
                  id="All Leads" 
                  icon="💼" 
                  active={view === 'Leads' && !selectedAgentFilter} 
                  onClick={() => { setView('Leads'); setSelectedAgentFilter(null); setDashboardFilter(null); setIsLeadsOpen(!isLeadsOpen); }}
                  count={leads.length}
                  hasDropdown
                  isOpen={isLeadsOpen}
                />
                
                {isLeadsOpen && (
                  <div className="mt-1 space-y-1 animate-in slide-in-from-top-1 duration-200">
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
                icon="⏰" 
                active={view === 'Follow-ups'} 
                onClick={() => { setView('Follow-ups'); setDashboardFilter(null); setSelectedAgentFilter(null); }}
                count={leads.filter((l) => (l.status === 'Follow-up' || Boolean(l.followUpDate)) && !l.followUpCompleted).length}
              />
            )}

            {/* Payment Desk */}
            {hasAccess('Payments') && (
              <>
                <NavItem 
                  id="Payment Desk" 
                  icon="💳" 
                  active={view === 'Payments'} 
                  onClick={() => { 
                    setView('Payments'); 
                    setIsPaymentsOpen(!isPaymentsOpen); 
                  }}
                  hasDropdown
                  isOpen={isPaymentsOpen}
                />

                {isPaymentsOpen && (
                  <div className="mt-1 space-y-1 animate-in slide-in-from-top-1 duration-200">
                    <NavItem 
                      id="1. Payment Links" 
                      active={view === 'Payments' && paymentTab === 'Links'} 
                      onClick={() => { setView('Payments'); setPaymentTab('Links'); }} 
                      isSubItem
                    />
                    <NavItem 
                      id="2. EMI & Installments" 
                      active={view === 'Payments' && paymentTab === 'Installments'} 
                      onClick={() => { setView('Payments'); setPaymentTab('Installments'); }} 
                      isSubItem
                    />
                    <NavItem 
                      id="3. Submissions & UTR" 
                      active={view === 'Payments' && paymentTab === 'Submissions'} 
                      onClick={() => { setView('Payments'); setPaymentTab('Submissions'); }} 
                      isSubItem
                    />
                    <NavItem 
                      id="4. Create Payment Link" 
                      active={view === 'Payments' && paymentTab === 'CreateLink'} 
                      onClick={() => { setView('Payments'); setPaymentTab('CreateLink'); }} 
                      isSubItem
                    />
                    <NavItem 
                      id="5. Payment Settings" 
                      active={view === 'Payments' && paymentTab === 'Settings'} 
                      onClick={() => { setView('Payments'); setPaymentTab('Settings'); }} 
                      isSubItem
                    />
                  </div>
                )}
              </>
            )}

            {/* 4. Operations Desk */}
            {hasAccess('Operations') && (
              <>
                <NavItem 
                  id="Operations Desk" 
                  icon="🧳" 
                  active={view === 'Operations' && opsTab !== 'invoices'} 
                  onClick={() => { 
                    setView('Operations'); 
                    setIsOpsOpen(!isOpsOpen); 
                  }}
                  hasDropdown
                  isOpen={isOpsOpen}
                />

                {isOpsOpen && (
                  <div className="mt-1 space-y-1 animate-in slide-in-from-top-1 duration-200">
                    <NavItem 
                      id="1. Converted Leads Module" 
                      active={view === 'Operations' && opsTab === 'customer'} 
                      onClick={() => { setView('Operations'); setOpsTab('customer'); }} 
                      count={opsCounts.customers}
                      isSubItem
                    />
                    <NavItem 
                      id="2. Pending Vouchers" 
                      active={view === 'Operations' && opsTab === 'pending-vouchers'} 
                      onClick={() => { setView('Operations'); setOpsTab('pending-vouchers'); }} 
                      count={opsCounts.pendingVouchers}
                      isSubItem
                    />
                    <NavItem 
                      id="3. Uploaded Vouchers" 
                      active={view === 'Operations' && opsTab === 'uploaded-vouchers'} 
                      onClick={() => { setView('Operations'); setOpsTab('uploaded-vouchers'); }} 
                      isSubItem
                    />
                    <NavItem 
                      id="4. Upcoming Trips" 
                      active={view === 'Operations' && opsTab === 'upcoming-trips'} 
                      onClick={() => { setView('Operations'); setOpsTab('upcoming-trips'); }} 
                      count={opsCounts.upcomingTrips}
                      isSubItem
                    />
                    <NavItem 
                      id="5. Day-Wise Trip" 
                      active={view === 'Operations' && opsTab === 'day-wise-trip'} 
                      onClick={() => { setView('Operations'); setOpsTab('day-wise-trip'); }} 
                      isSubItem
                    />
                    <NavItem 
                      id="6. Payment Management" 
                      active={view === 'Operations' && opsTab === 'cab-logistics'} 
                      onClick={() => { setView('Operations'); setOpsTab('cab-logistics'); }} 
                      isSubItem
                    />
                    <NavItem 
                      id="7. Completed Trips" 
                      active={view === 'Operations' && opsTab === 'completed-trips'} 
                      onClick={() => { setView('Operations'); setOpsTab('completed-trips'); }} 
                      isSubItem
                    />
                  </div>
                )}
              </>
            )}

            {/* Invoices Desk (Accessible for Invoices, Accounts, or Operations permissions) */}
            {(hasAccess('Invoices') || hasAccess('Accounts') || hasAccess('Operations')) && (
              <NavItem 
                id="Invoices Desk" 
                icon="📄" 
                active={view === 'Operations' && opsTab === 'invoices'} 
                onClick={() => { setView('Operations'); setOpsTab('invoices'); }} 
              />
            )}

            {/* Hotel Vouchers Desk - Placed right before Accounts */}
            {hasAccess('HotelVouchers') && (
              <NavItem 
                id="Hotel Vouchers" 
                icon="🏨" 
                active={view === 'HotelVouchers'} 
                onClick={() => { setView('HotelVouchers'); setDashboardFilter(null); setSelectedAgentFilter(null); }} 
                count={opsCounts.pendingVouchers}
              />
            )}

            {/* Accounts Desk */}
            {hasAccess('Accounts') && (
              <NavItem 
                id="Accounts" 
                icon="💰" 
                active={view === 'Accounts'} 
                onClick={() => { setView('Accounts'); setDashboardFilter(null); setSelectedAgentFilter(null); }} 
                count={opsCustomersList.filter((c: any) => c.status === 'Completed').length || leads.filter(l => (l.status || '').toLowerCase() === 'completed').length}
              />
            )}

            {hasAccess('Saved Itinerary') && (
              <NavItem id="Saved Itinerary" icon="🌴" active={view === 'Saved Itinerary'} onClick={() => setView('Saved Itinerary')} />
            )}

            {hasAccess('Sales Team') && (
              <NavItem id="Sales Team" icon="👥" active={view === 'Sales Team'} onClick={() => setView('Sales Team')} />
            )}

            {hasAccess('User Management') && (
              <NavItem id="User Management" icon="🛡️" active={view === 'User Management'} onClick={() => setView('User Management')} />
            )}
          </div>

          {/* Sales Experts List (Hidden for Accounts Users) */}
          {!hasAccess('Accounts') && (hasAccess('Leads') || hasAccess('Sales Team') || currentUser.role === 'Admin') && (
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Sales Experts</p>
              <div className="space-y-2">
                {agents.map((agent) => {
                  const isAgentActive = selectedAgentFilter === agent.id;
                  const isExpanded = expandedAgentId === agent.id;
                  
                  return (
                    <div key={agent.id} className="space-y-1">
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
                        <div className="mt-1 space-y-0.5 animate-in slide-in-from-top-1 duration-200 border-l-2 border-slate-50 ml-6 pl-2">
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
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-10 shrink-0 sticky top-0 z-10 gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
             <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight shrink-0 uppercase">{view}</h2>
             <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
             
             <div className="relative flex-1 max-w-md hidden md:block">
                <input type="text" placeholder="Global search leads..." className="w-full bg-slate-100 border-none rounded-xl px-5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </div>
          </div>

          {/* Active Logged-in User Switcher Header Widget */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-2.5 border border-slate-200">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={currentUser.name}
                className="w-8 h-8 rounded-xl object-cover border border-white shadow-sm"
              />
              <div className="text-left pr-1 hidden sm:block">
                <div className="text-xs font-black text-slate-900 leading-tight flex items-center gap-1">
                  <span>{currentUser.name}</span>
                  <span
                    className={`text-[8.5px] px-1.5 py-0.2 rounded font-black uppercase ${
                      currentUser.role === 'Admin'
                        ? 'bg-purple-100 text-purple-700'
                        : currentUser.role === 'Operations'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{currentUser.email}</div>
              </div>

              {/* User Switcher Dropdown */}
              {users.length > 0 && (
                <select
                  value={currentUser.id}
                  onChange={e => {
                    const targetUser = users.find(u => u.id === e.target.value);
                    if (targetUser) handleSwitchUser(targetUser);
                  }}
                  className="bg-white border border-slate-200 rounded-xl px-2 py-1 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                  title="Switch Logged-in User Account to test permissions"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role} - {u.accessLevel === 'ViewOnly' ? '👁️ View Only' : '✏️ Editor'}) {u.email === 'rohit.digitalmarketing19@gmail.com' ? '👑 Admin' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Lock / Logout Button */}
            <button
              onClick={handleLogout}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              title="Lock CRM & Sign Out"
            >
              <span>🔒 Sign Out</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar scroll-smooth">
          {view === 'Dashboard' && (
            <div className="space-y-12 animate-in fade-in duration-700">
              <div className="flex justify-between items-end">
                 <div>
                    <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Kingsland Analytics</h3>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Performance Matrix</h2>
                 </div>
                 <div className="flex gap-4">
                    <button onClick={() => setView('New Inquiry')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all">GENERATE NEW INQUIRY</button>
                 </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {[
                  { label: 'Active leads', filterKey: 'Active leads', count: stats.active, color: 'indigo' },
                  { label: 'Update lead', filterKey: 'Update lead', count: stats.updated, color: 'blue' },
                  { label: 'Hot Lead', filterKey: 'Hot Lead', count: stats.hot, color: 'rose' },
                  { label: 'In process', filterKey: 'In process', count: stats.inProgress, color: 'amber' },
                  { label: 'Converted', filterKey: 'Converted', count: stats.converted, color: 'emerald' },
                  { label: 'Cancel', filterKey: 'Cancel', count: stats.cancel, color: 'slate' },
                  { label: 'Postponed', filterKey: 'Postponed', count: stats.postponed, color: 'purple' },
                ].map((stat) => (
                  <button key={stat.label} onClick={() => { setView('Leads'); setDashboardFilter(stat.filterKey); }} className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left relative overflow-hidden group`}><div className={`absolute top-0 right-0 w-16 h-16 bg-${stat.color}-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform`}></div><p className={`text-[9px] font-black text-${stat.color}-500 uppercase tracking-widest mb-3 opacity-80`}>{stat.label}</p><p className="text-3xl font-black text-slate-800 tracking-tighter">{stat.count}</p></button>
                ))}
              </div>

              {/* PAYMENT DESK - EMI & INSTALLMENTS STATUS DASHBOARD CARD */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8 rounded-[3rem] shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        💳
                      </span>
                      <h3 className="text-xl font-black text-white tracking-tight">Payment Desk & EMI Installments Tracker</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Live breakdown of created EMIs, upcoming due dates, overdue installment alerts, and collected revenue.</p>
                  </div>

                  <button
                    onClick={() => { setView('Payments'); setPaymentTab('Installments'); }}
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all"
                  >
                    Open EMI Management →
                  </button>
                </div>

                {/* 4 Key EMI Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Card 1: Total EMIs Created */}
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total EMIs Created</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-black text-white">{emiStats.createdCount}</span>
                      <span className="text-xs font-mono font-bold text-slate-300">₹{emiStats.createdAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Total generated payment schedules</p>
                  </div>

                  {/* Card 2: EMIs Due (Upcoming) */}
                  <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">EMIs Due (Upcoming)</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-black text-amber-400">{emiStats.dueCount}</span>
                      <span className="text-xs font-mono font-bold text-amber-300">₹{emiStats.dueAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-[10px] text-amber-200/80">Pending upcoming customer payments</p>
                  </div>

                  {/* Card 3: EMIs Overdue */}
                  <div className="p-5 rounded-2xl bg-rose-500/15 border border-rose-500/40 backdrop-blur-md space-y-2 ring-2 ring-rose-500/20">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-300 block flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                      EMIs Overdue (Urgent)
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-black text-rose-400">{emiStats.overdueCount}</span>
                      <span className="text-xs font-mono font-bold text-rose-300">₹{emiStats.overdueAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-[10px] text-rose-200/80">Requires immediate payment collection</p>
                  </div>

                  {/* Card 4: EMIs Collected */}
                  <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">EMIs Collected (Paid)</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-black text-emerald-400">{emiStats.paidCount}</span>
                      <span className="text-xs font-mono font-bold text-emerald-300">₹{emiStats.paidAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-[10px] text-emerald-200/80">Verified & cleared payments</p>
                  </div>

                </div>

                {/* Overdue & Upcoming EMI Alerts List */}
                {emiStats.overdueItems.length > 0 && (
                  <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 space-y-2 text-xs">
                    <h4 className="font-extrabold text-rose-300 text-xs uppercase tracking-wider flex items-center gap-2">
                      ⚠️ Active Overdue EMI Alerts ({emiStats.overdueItems.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {emiStats.overdueItems.map((item: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-900/90 border border-rose-900/50 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-white text-xs">{item.customerName}</p>
                            <p className="text-[10px] text-slate-400">{item.title} • Due: <strong className="text-rose-400">{item.dueDate}</strong></p>
                          </div>
                          <span className="font-mono font-black text-rose-400 text-sm">₹{item.amount?.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 h-[450px] flex flex-col"><h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-10 pb-4 border-b border-slate-50">Conversion Pipeline</h3><div className="flex-1 min-h-0"><ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={250}><BarChart data={funnelData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} /><Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800 }} /><Bar dataKey="count" radius={[12, 12, 12, 12]} barSize={40}>{funnelData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Bar></BarChart></ResponsiveContainer></div></div>
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 h-[450px] flex flex-col"><h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-10 pb-4 border-b border-slate-50">Market Intent</h3><div className="flex-1 min-h-0"><ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={250}><PieChart><Pie data={[{ name: 'High Intent', value: leads.filter(l => l.intent === LeadIntent.HIGH).length }, { name: 'Info Seeking', value: leads.filter(l => l.intent === LeadIntent.INFO).length }, { name: 'Urgent', value: leads.filter(l => l.intent === LeadIntent.URGENT).length },]} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={12} dataKey="value">{COLORS.map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}</Pie><Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800 }} /></PieChart></ResponsiveContainer></div><div className="flex justify-center gap-10"><div className="flex items-center gap-3"><div className="w-3 h-3 bg-indigo-500 rounded-full shadow-lg shadow-indigo-100"></div><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">High Intent</span></div><div className="flex items-center gap-3"><div className="w-3 h-3 bg-emerald-500 rounded-full shadow-lg shadow-emerald-100"></div><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Info Seeking</span></div></div></div>
              </div>
            </div>
          )}


          {view === 'New Inquiry' && (
            <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500 space-y-16">
               <div className="mb-12">
                  <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 uppercase">NEW INQUIRY CENTER</h2>
                  <p className="text-slate-500 font-medium text-lg">Generate new travel leads and manage incoming queries instantly.</p>
               </div>

               <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-2xl space-y-12">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-6">Generate Inquiry</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Trip ID (Auto-Generated / Custom)</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono" value={formData.tripId} onChange={e => setFormData({...formData, tripId: e.target.value})} placeholder="e.g. KL-1005" />
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Source of Lead</label>
                      <select className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}>
                        <option value="Google Ads">Google Ads</option>
                        <option value="Meta Ads">Meta Ads</option>
                        <option value="Website">Website</option>
                        <option value="Reference">Reference</option>
                        <option value="Other">Other</option>
                        <option value="Repeated Client">Repeated Client</option>
                      </select>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Customer Full Name</label>
                      <input type="text" required className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="e.g. Robert Pattinson" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phone / WhatsApp</label>
                      <input type="text" required className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="+91 00000 00000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Travel Destination</label>
                      <input type="text" required className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="e.g. Rajasthan" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} />
                    </div>
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Travel Date (Min. Today)</label>
                      <input type="date" required min={todayStr} className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" value={formData.travelDate} onChange={e => setFormData({...formData, travelDate: e.target.value})} />
                    </div>
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">No. of Days & Nights</label>
                      <div className="flex gap-4"><div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl flex items-center px-4"><input type="number" className="w-full bg-transparent p-4 text-sm font-black outline-none" value={formData.days} onChange={e => handleDayChange(parseInt(e.target.value) || 0)} /><span className="text-[10px] font-black text-slate-300 uppercase mr-4">Days</span></div><div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl flex items-center px-4"><input type="number" className="w-full bg-transparent p-4 text-sm font-black outline-none" value={formData.nights} onChange={e => handleNightChange(parseInt(e.target.value) || 0)} /><span className="text-[10px] font-black text-slate-300 uppercase mr-4">Nights</span></div></div>
                    </div>
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Traveler Matrix</label>
                      <div className="flex gap-4"><div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl flex items-center px-4"><input type="number" min="1" className="w-full bg-transparent p-4 text-sm font-black outline-none" value={formData.adults} onChange={e => setFormData({...formData, adults: parseInt(e.target.value) || 1})} /><span className="text-[10px] font-black text-slate-300 uppercase mr-4">Adults</span></div><div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl flex items-center px-4"><input type="number" min="0" className="w-full bg-transparent p-4 text-sm font-black outline-none" value={formData.children} onChange={e => handleChildCountChange(parseInt(e.target.value) || 0)} /><span className="text-[10px] font-black text-slate-300 uppercase mr-4">Children</span></div></div>
                    </div>

                    {formData.children > 0 && (
                      <div className="space-y-4 col-span-1 md:col-span-2 bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100">
                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-2">Child Ages (Required for Hotel/Activity Pricing)</label>
                        <div className="flex flex-wrap gap-4">
                          {formData.childAges.map((age, index) => (
                            <div key={index} className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-indigo-100 shadow-sm">
                              <span className="text-xs font-bold text-slate-700">Child {index + 1}:</span>
                              <input
                                type="number"
                                min="0"
                                max="17"
                                className="w-16 bg-slate-50 p-2 text-sm font-black rounded-xl border border-slate-200 outline-none text-center"
                                value={age}
                                onChange={(e) => {
                                  const newAges = [...formData.childAges];
                                  newAges[index] = parseInt(e.target.value) || 0;
                                  setFormData({ ...formData, childAges: newAges });
                                }}
                              />
                              <span className="text-[10px] font-black text-slate-400">yrs</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Hotel Preference & Category</label>
                      <div className="flex gap-4">
                        <select className="flex-1 bg-slate-50 border border-slate-100 rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" value={formData.hotelCategory} onChange={e => setFormData({...formData, hotelCategory: e.target.value})}>
                          <option value="5 Star">5 Star Luxury Resort</option>
                          <option value="4 Star">4 Star Premium Hotel</option>
                          <option value="4/3 Star">4/3 Star Comfort (Default)</option>
                          <option value="3 Star">3 Star Deluxe Hotel</option>
                          <option value="Luxury Villa">Luxury Private Villa</option>
                          <option value="Heritage Resort">Heritage / Boutique Hotel</option>
                          <option value="Budget Stay">Budget / Standard Hotel</option>
                        </select>
                        <select className="w-36 bg-slate-50 border border-slate-100 rounded-[1.5rem] px-4 py-4 text-xs font-bold outline-none" value={formData.includeStay} onChange={e => setFormData({...formData, includeStay: e.target.value})}>
                          <option value="Yes">Stay: Yes</option>
                          <option value="No">Stay: No</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Transit & Vehicle Preference</label>
                      <div className="flex items-center gap-4">
                        <select className="flex-1 bg-slate-50 border border-slate-100 rounded-[1.5rem] px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" value={formData.includeCab} onChange={e => setFormData({...formData, includeCab: e.target.value})}>
                          <option value="Yes">Private Car / Cab: Included</option>
                          <option value="No">Private Car / Cab: Excluded</option>
                        </select>
                        <select className="w-36 bg-slate-50 border border-slate-100 rounded-[1.5rem] px-4 py-4 text-xs font-bold outline-none" value={formData.includeFlight} onChange={e => setFormData({...formData, includeFlight: e.target.value})}>
                          <option value="No">Flight: No</option>
                          <option value="Yes">Flight: Yes</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4 col-span-1 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Special Requirements / Comments</label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                          <input type="checkbox" checked={formData.englishDriver} onChange={e => setFormData({...formData, englishDriver: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
                          <span>English-Speaking Driver Required</span>
                        </label>
                      </div>
                      <textarea rows={3} className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-6 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="Enter any special requests, dietary preferences, places to visit, flight numbers, or budget constraints..." value={formData.otherInfo} onChange={e => setFormData({...formData, otherInfo: e.target.value})}></textarea>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Assigned Sales Expert</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       {agents.map(a => (<button key={a.id} type="button" onClick={() => setFormData({...formData, salesPersonId: a.id})} className={`p-4 rounded-[2rem] border transition-all flex flex-col items-center gap-3 ${formData.salesPersonId === a.id ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-400'}`}><img src={a.avatar} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt={a.name} /><span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">{a.name}</span></button>))}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-slate-100">
                    <button 
                      type="button" 
                      onClick={() => handleFinalizeInquiry(false)} 
                      className="flex-1 py-5 bg-white border-2 border-slate-200 text-slate-800 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      💾 SAVE LEAD DIRECTLY
                    </button>
                    <button 
                      type="button" disabled={isAnalyzing} 
                      onClick={handleAIAssessment} 
                      className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isAnalyzing ? (<><svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>ANALYZING...</>) : '✨ PREVIEW AI ASSESSMENT'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleFinalizeInquiry(true)} 
                      className="flex-1 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                      ⚡ SAVE & GIVE QUOTE
                    </button>
                  </div>

                  {previewAnalysis && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pt-6 border-t border-slate-50">
                        <div className="p-8 bg-indigo-50 rounded-[3rem] border border-indigo-100 flex flex-col md:flex-row items-center gap-10">
                           <div className="text-center md:text-left">
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">INTENT SCORE</p>
                              <div className="flex items-center justify-center md:justify-start gap-4">
                                 <span className="text-6xl font-black text-indigo-700 tracking-tighter">{previewAnalysis.score}</span>
                                 <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{previewAnalysis.intent}</span>
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase">{previewAnalysis.budgetTier} Tier</span>
                                 </div>
                              </div>
                           </div>
                           <div className="flex-1 space-y-2">
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI SUMMARY</p>
                              <p className="text-sm font-bold text-indigo-900/80 leading-relaxed italic">"{previewAnalysis.summary}"</p>
                           </div>
                        </div>
                    </div>
                  )}
               </div>

               <div className="space-y-8">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                     <h3 className="text-xl font-black text-slate-900 uppercase tracking-[0.2em]">Recently Added Leads</h3>
                     <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                        {unquotedLeads.length} New Unquoted Inquiries
                     </span>
                  </div>
                  
                  <div className="space-y-4">
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
                       <div className="py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No unquoted leads currently.</p>
                       </div>
                     )}
                  </div>
               </div>
            </div>
          )}

          {view === 'Leads' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2"><span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Kingsland Analysis Desk</span><div className="w-1 h-1 bg-slate-300 rounded-full"></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredLeads.length} Matching Results</span></div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
                      {selectedAgentFilter ? `${agents.find(a => a.id === selectedAgentFilter)?.name}${dashboardFilter ? ` • ${dashboardFilter}` : ''}` : (dashboardFilter || 'Active Pipeline')}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-3">
                     <button onClick={() => setView('Operations')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition-all">🧳 OPERATIONS DESK</button>
                     <button onClick={() => setView('Payments')} className="px-6 py-3 bg-[#7B1D2A] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-slate-900 transition-all">💳 PAYMENTS DESK</button>
                     <button onClick={() => setView('New Inquiry')} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all">GENERATE NEW INQUIRY</button>
                  </div>
               </div>

               {/* MULTI-CRITERIA ADVANCED FILTERS TOOLBAR */}
               <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4 flex-1">
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destination:</span>
                        <select value={filterDestination} onChange={e => setFilterDestination(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none">
                           <option value="All">All Destinations</option>
                           {uniqueDestinations.map(d => (<option key={d} value={d}>{d}</option>))}
                        </select>
                     </div>

                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Travel Month:</span>
                        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none">
                           <option value="All">All Travel Months</option>
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

                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Source:</span>
                        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none">
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
                     <button onClick={() => { setFilterDestination('All'); setFilterMonth('All'); setFilterSource('All'); }} className="text-xs font-black text-rose-500 uppercase tracking-widest hover:underline">
                        Reset Filters
                     </button>
                  )}
               </div>

               <div className="grid grid-cols-1 gap-2">
                  {filteredLeads.length > 0 ? (filteredLeads.map(lead => (<LeadCard key={lead.id} lead={lead} onClick={setQuotingLead} onViewProposal={setProposalLead} onDeleteLead={handleDeleteLead} agentName={agents.find(a => a.id === lead.assignedTo)?.name} showGiveQuote />))) : (<div className="py-32 flex flex-col items-center justify-center text-center px-12 bg-white border border-slate-100 rounded-[3rem] shadow-sm"><div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-8"><span className="text-5xl grayscale opacity-30">🔍</span></div><h4 className="text-2xl font-black text-slate-900 mb-3 tracking-tighter uppercase">No results found</h4><p className="text-sm text-slate-400 max-w-sm font-bold leading-relaxed">Adjust your filters or search keywords to find the inquiries you're looking for.</p><button onClick={() => { setGlobalSearch(''); setDashboardFilter(null); setSelectedAgentFilter(null); setFilterDestination('All'); setFilterMonth('All'); setFilterSource('All'); }} className="mt-8 text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline">Clear all filters</button></div>)}
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
          {view === 'Sales Team' && (<div className="space-y-12 animate-in fade-in duration-500"><div className="flex justify-between items-end"><div><h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Internal Roster</h3><h2 className="text-4xl font-black text-slate-900 tracking-tighter">Sales Experts</h2></div><button onClick={() => setIsAddingAgent(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all">+ Add New Expert</button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{agents.map(agent => (<div key={agent.id} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1 transition-all group flex flex-col"><div className="flex items-center gap-6 mb-8"><img src={agent.avatar} className="w-16 h-16 rounded-[1.5rem] border-2 border-indigo-50 shadow-lg group-hover:scale-110 transition-transform" alt={agent.name} /><div><h4 className="text-lg font-black text-slate-900 tracking-tight">{agent.name}</h4><p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Lead Manager</p></div></div><div className="space-y-6 flex-1"><div><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Destinations</p><div className="flex flex-wrap gap-2">{agent.specialty.map(s => (<span key={s} className="px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-black rounded-lg uppercase tracking-tight border border-slate-100">{s}</span>))}</div></div><div className="grid grid-cols-2 gap-4"><div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Leads</p><p className="text-xl font-black text-slate-800">{leads.filter(l => l.assignedTo === agent.id).length}</p></div><div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100"><p className="text-[8px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Won Rate</p><p className="text-xl font-black text-emerald-700">12%</p></div></div></div><div className="mt-10 pt-8 border-t border-slate-50 flex gap-2"><button onClick={() => { setView('Leads'); setSelectedAgentFilter(agent.id); }} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-800 transition-all">View Desk</button><button onClick={() => setDeletingAgentId(agent.id)} className="px-4 py-3 bg-rose-50 text-rose-500 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-100 transition-all">Remove</button></div></div>))}</div></div>)}
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
        </div>
      </main>


      {proposalLead && (<LeadProposalView lead={proposalLead} agentName={agents.find(a => a.id === proposalLead.assignedTo)?.name || 'Alex Thompson'} onClose={() => setProposalLead(null)} onUpdateStatus={handleUpdateLeadStatus} onAddNote={handleAddNote} onDeleteLead={handleDeleteLead} onEditQuote={(lead, qId) => { setQuotingLead(lead); setEditQuoteId(qId); setProposalLead(null); }} onNewQuote={(lead) => { setQuotingLead(lead); setEditQuoteId(null); setProposalLead(null); }} onDeleteQuote={(leadId, qId) => { handleDeleteQuote(leadId, qId); }} isReadOnly={currentUser.accessLevel === 'ViewOnly' || view === 'Accounts'} />)}
      {selectedLead && (<LeadDetails lead={selectedLead} agentName={agents.find(a => a.id === selectedLead.assignedTo)?.name || ''} onClose={() => setSelectedLead(null)} onUpdateStatus={handleUpdateLeadStatus} onDeleteLead={handleDeleteLead} />)}
      {quotingLead && (<GiveQuoteView lead={quotingLead} allLeads={leads} editQuoteId={editQuoteId} onClose={() => { setQuotingLead(null); setEditQuoteId(null); }} onSave={handleSaveQuote} />)}
      {isAddingAgent && (<div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"><div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-sm p-10 overflow-hidden animate-in zoom-in-95 duration-300"><h3 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter">Add Sales Expert</h3><p className="text-sm text-slate-500 mb-8 font-medium">Register a new lead manager.</p><form onSubmit={handleAddAgent} className="space-y-6"><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Name</label><input type="text" required value={agentFormData.name} onChange={e => setAgentFormData({...agentFormData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none" /></div><div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Specialty</label><input type="text" required value={agentFormData.specialty} onChange={e => setAgentFormData({...agentFormData, specialty: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none" /></div><div className="flex gap-4 pt-6"><button type="button" onClick={() => setIsAddingAgent(false)} className="flex-1 py-5 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl">Cancel</button><button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Add</button></div></form></div></div>)}
      {deletingAgentId && (<div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300"><div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-12 text-center animate-in zoom-in-95 duration-300"><div className="w-20 h-20 mx-auto rounded-3xl bg-rose-50 flex items-center justify-center mb-8 shadow-xl text-3xl">⚠️</div><h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tighter">Deactivate Expert?</h3><div className="flex gap-4"><button onClick={() => setDeletingAgentId(null)} className="flex-1 py-5 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl">Cancel</button><button onClick={() => handleDeleteAgent(deletingAgentId)} className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Delete</button></div></div></div>)}

      {/* CRM LOGIN / LOCK SCREEN MODAL */}
      <LoginModal
        isOpen={isLoginModalOpen}
        users={users}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem('kingsland_active_user_id', user.id);
          setIsLoginModalOpen(false);
        }}
      />
    </div>
  );
};

export default App;
