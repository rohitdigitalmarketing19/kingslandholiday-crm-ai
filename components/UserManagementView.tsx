import React, { useState, useEffect } from 'react';
import { UserAccount, UserRole, UserPermissionSection } from '../types';

interface UserManagementViewProps {
  users: UserAccount[];
  currentUser: UserAccount;
  onAddUser: (user: Partial<UserAccount>) => Promise<void>;
  onUpdateUser: (id: string, user: Partial<UserAccount>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onSwitchUser: (user: UserAccount) => void;
}

const ALL_SECTIONS: { id: UserPermissionSection; label: string; icon: string; desc: string; category: 'General' | 'Sales' | 'Operations' | 'Admin' }[] = [
  { id: 'Dashboard', label: 'Executive Dashboard', icon: '📊', desc: 'KPI cards, monthly graphs, and overall business overview', category: 'General' },
  { id: 'Leads', label: 'Leads Pipeline', icon: '📋', desc: 'Manage lead cards, stages, statuses, and inquiry details', category: 'Sales' },
  { id: 'New Inquiry', label: 'Create New Inquiry', icon: '➕', desc: 'Form to submit and parse new client travel inquiries', category: 'Sales' },
  { id: 'Follow-ups', label: 'Follow-ups & Reminders', icon: '📞', desc: 'Scheduled client call logs, post-poned date filters, touchpoints', category: 'Sales' },
  { id: 'Saved Itinerary', label: 'Itinerary Library', icon: '🗺️', desc: 'Pre-built package itineraries and day-wise templates', category: 'Sales' },
  { id: 'HotelVouchers', label: 'Hotel Voucher Desk', icon: '🏨', desc: 'Hotel-side voucher uploads, hotel email dispatch, confirmation tracker', category: 'Operations' },
  { id: 'Operations', label: 'Operations Portal', icon: '🚗', desc: 'Trip execution, cab drivers, day-wise itineraries, customer readiness', category: 'Operations' },
  { id: 'Payments', label: 'Payment Management', icon: '💳', desc: 'Generate payment links, part-payment installments, UTR verification', category: 'Admin' },
  { id: 'Accounts', label: 'Accounts & Audit', icon: '📑', desc: 'Hotel/Cab 2-part disbursement logs, monthly lead filtering, revenue', category: 'Admin' },
  { id: 'Invoices', label: 'Tax & Package Invoices', icon: '📄', desc: 'Generate & view tax invoices, GST breakdowns, customer receipts', category: 'Admin' },
  { id: 'Analytics', label: 'Analytics & Reports', icon: '📈', desc: 'Conversion rates, destination breakdown, revenue metrics', category: 'Sales' },
  { id: 'Sales Team', label: 'Sales Team Management', icon: '👥', desc: 'Assign leads to sales representatives, track performance', category: 'Admin' },
  { id: 'User Management', label: 'User & Permission Management', icon: '🛡️', desc: 'Create users, assign roles, configure section access rights', category: 'Admin' }
];

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onSwitchUser
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Create / Edit User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
    department: string;
    status: 'Active' | 'Inactive';
    accessLevel: 'Editor' | 'ViewOnly';
    permissions: UserPermissionSection[];
  }>({
    name: '',
    email: '',
    phone: '',
    password: 'kingsland123',
    role: 'Sales',
    department: 'Sales',
    status: 'Active',
    accessLevel: 'Editor',
    permissions: ['Dashboard', 'Leads', 'New Inquiry', 'Follow-ups', 'Saved Itinerary']
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // --- ADMIN OTP PASSWORD RESET MODAL STATE ---
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpTargetUser, setOtpTargetUser] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpPreviewCode, setOtpPreviewCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpMsg, setOtpMsg] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // OTP Countdown Effect
  useEffect(() => {
    let timer: any;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: 'kingsland123',
      role: 'Sales',
      department: 'Sales',
      status: 'Active',
      accessLevel: 'Editor',
      permissions: ['Dashboard', 'Leads', 'New Inquiry', 'Follow-ups', 'Saved Itinerary', 'Analytics']
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (u: UserAccount) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      password: u.password || 'kingsland123',
      role: u.role,
      department: u.department || 'Sales',
      status: u.status,
      accessLevel: u.accessLevel || 'Editor',
      permissions: u.permissions || []
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Open OTP Password Reset Modal for a target user
  const handleOpenOtpResetModal = (u: UserAccount) => {
    setOtpTargetUser(u);
    setNewPassword('');
    setOtpCodeInput('');
    setOtpSent(false);
    setOtpPreviewCode('');
    setOtpMsg('');
    setOtpCountdown(0);
    setIsOtpModalOpen(true);
  };

  // Trigger Send OTP to Admin Email (rohit.digitalmarketing19@gmail.com)
  const handleSendAdminOtp = async () => {
    try {
      setIsSendingOtp(true);
      setOtpMsg('');

      const res = await fetch('/api/users/send-admin-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Backend API is unreachable (Server returned HTML instead of JSON). Ensure Node.js backend is running on Hostinger.');
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP.');
      }

      setOtpSent(true);
      setOtpCountdown(60); // 60 seconds countdown before resend
      setOtpMsg(data.emailSent ? `✅ 6-Digit OTP Code emailed to rohit.digitalmarketing19@gmail.com!` : `✅ 6-Digit OTP requested! Please check the Admin Email inbox.`);
    } catch (err: any) {
      setOtpMsg(`⚠️ ${err.message}`);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify Admin OTP & Confirm Password Update
  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpTargetUser) return;

    if (!newPassword || newPassword.trim().length < 4) {
      setOtpMsg('⚠️ New password must be at least 4 characters long.');
      return;
    }

    if (!otpCodeInput || otpCodeInput.trim().length !== 6) {
      setOtpMsg('⚠️ Please enter the 6-digit OTP code.');
      return;
    }

    try {
      setIsVerifyingOtp(true);
      setOtpMsg('');

      const res = await fetch(`/api/users/${otpTargetUser.id}/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: newPassword.trim(),
          otpCode: otpCodeInput.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify OTP & update password.');
      }

      // Update local state if successful
      await onUpdateUser(otpTargetUser.id, { password: newPassword.trim() });
      alert(`🎉 Password successfully updated for ${otpTargetUser.name}!`);
      setIsOtpModalOpen(false);
    } catch (err: any) {
      setOtpMsg(`⚠️ ${err.message}`);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Role Preset Selection
  const applyRolePreset = (role: UserRole) => {
    setFormData(prev => {
      let newPermissions: UserPermissionSection[] = [];
      let nextAccessLevel: 'Editor' | 'ViewOnly' = 'Editor';

      if (role === 'Admin') {
        newPermissions = ALL_SECTIONS.map(s => s.id);
        nextAccessLevel = 'Editor';
      } else if (role === 'Operations') {
        newPermissions = ['Operations', 'HotelVouchers', 'Saved Itinerary'];
        nextAccessLevel = 'Editor';
      } else if (role === 'Accounts') {
        newPermissions = ['Accounts', 'Invoices', 'Operations'];
        nextAccessLevel = 'ViewOnly';
      } else if (role === 'Sales') {
        newPermissions = ['Dashboard', 'Leads', 'New Inquiry', 'Follow-ups', 'Saved Itinerary', 'Analytics'];
        nextAccessLevel = 'Editor';
      } else {
        newPermissions = prev.permissions;
        nextAccessLevel = prev.accessLevel;
      }

      return {
        ...prev,
        role,
        department: role === 'Operations' ? 'Operations' : role === 'Accounts' ? 'Accounts' : role === 'Admin' ? 'Management' : 'Sales',
        accessLevel: nextAccessLevel,
        permissions: newPermissions
      };
    });
  };

  // Toggle Section Permission
  const togglePermission = (sectionId: UserPermissionSection) => {
    setFormData(prev => {
      const exists = prev.permissions.includes(sectionId);
      const nextPerms = exists 
        ? prev.permissions.filter(p => p !== sectionId)
        : [...prev.permissions, sectionId];

      return {
        ...prev,
        role: 'Custom',
        permissions: nextPerms
      };
    });
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setErrorMsg('Name and Email are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      if (editingUser) {
        await onUpdateUser(editingUser.id, formData);
      } else {
        await onAddUser(formData);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery));

    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const adminCount = users.filter(u => u.role === 'Admin').length;
  const salesCount = users.filter(u => u.role === 'Sales').length;
  const opsCount = users.filter(u => u.role === 'Operations').length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl text-xl font-bold">🛡️</span>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">User & Role Permission Management</h1>
              <p className="text-xs text-slate-500 font-medium">Create team members for Sales & Operations with password security and Admin OTP verification</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Logged in As</span>
            <span className="text-xs font-black text-slate-900 flex items-center gap-1">
              👑 {currentUser.name} ({currentUser.role})
            </span>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
          >
            <span>➕ Add New User</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Registered Users</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{users.length}</span>
            <span className="text-[11px] text-slate-500 font-medium">Active CRM Accounts</span>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl">👥</div>
        </div>

        <div className="bg-indigo-900 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block">Admin Superusers</span>
            <span className="text-2xl font-black text-white mt-1 block">{adminCount}</span>
            <span className="text-[10px] text-indigo-200 truncate block">rohit.digitalmarketing19@gmail.com</span>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl backdrop-blur-sm">👑</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block">Sales Executives</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{salesCount}</span>
            <span className="text-[11px] text-slate-500 font-medium">Lead & Quote Managers</span>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl">💼</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block">Operations Team</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{opsCount}</span>
            <span className="text-[11px] text-slate-500 font-medium">Vouchers & Cab Execution</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl">🚗</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
          <span className="absolute left-3 top-3 text-slate-400 text-xs">🔍</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Sales">Sales</option>
            <option value="Operations">Operations</option>
            <option value="Accounts">Accounts</option>
            <option value="Custom">Custom Access</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">User / Team Member</th>
                <th className="py-4 px-4">Role & Mode</th>
                <th className="py-4 px-4">Allowed Sections ({ALL_SECTIONS.length})</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    No matching team users found. Click "Add New User" to create one.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const isCurrentActive = currentUser.id === u.id;
                  return (
                    <tr key={u.id} className={`hover:bg-slate-50/80 transition-colors ${isCurrentActive ? 'bg-indigo-50/40' : ''}`}>
                      {/* User Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                            alt={u.name}
                            className="w-10 h-10 rounded-2xl object-cover border border-slate-200 shadow-sm"
                          />
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {u.name}
                              {u.email === 'rohit.digitalmarketing19@gmail.com' && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded-full">Primary Admin</span>
                              )}
                              {isCurrentActive && (
                                <span className="text-[9px] bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded-full">Current Active</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">{u.email}</div>
                            {u.phone && <div className="text-[10px] font-mono text-slate-400">{u.phone}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Role & Department */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                u.role === 'Admin'
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                  : u.role === 'Operations'
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  : u.role === 'Accounts'
                                  ? 'bg-teal-100 text-teal-700 border border-teal-200'
                                  : u.role === 'Sales'
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                  : 'bg-amber-100 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {u.role === 'Admin' ? '👑 Admin' : u.role === 'Operations' ? '🚗 Operations' : u.role === 'Accounts' ? '💰 Accounts' : u.role === 'Sales' ? '💼 Sales' : '⚙️ Custom'}
                            </span>

                            <button
                              type="button"
                              onClick={() => onUpdateUser(u.id, { accessLevel: u.accessLevel === 'ViewOnly' ? 'Editor' : 'ViewOnly' })}
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${
                                u.accessLevel === 'ViewOnly'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                              }`}
                              title="Click to toggle access mode (Editor vs View Only)"
                            >
                              {u.accessLevel === 'ViewOnly' ? '👁️ View Only' : '✏️ Editor'}
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">{u.department || 'General'}</div>
                        </div>
                      </td>

                      {/* Section Permissions Preview */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-700 text-[11px]">
                            {u.role === 'Admin' || u.permissions.length === ALL_SECTIONS.length ? (
                              <span className="text-purple-600 font-black">✨ Full Access ({ALL_SECTIONS.length} Sections)</span>
                            ) : (
                              <span>{u.permissions.length} of {ALL_SECTIONS.length} Sections Allowed</span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {u.permissions.slice(0, 4).map(pId => {
                              const s = ALL_SECTIONS.find(sec => sec.id === pId);
                              return (
                                <span key={pId} className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                                  {s?.icon || '•'} {pId}
                                </span>
                              );
                            })}
                            {u.permissions.length > 4 && (
                              <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">
                                +{u.permissions.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => onUpdateUser(u.id, { status: u.status === 'Active' ? 'Inactive' : 'Active' })}
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                            u.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {u.status === 'Active' ? '● Active' : '○ Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenOtpResetModal(u)}
                            title="Reset password via Admin OTP verification"
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-[10px] font-black border border-amber-200 transition-all flex items-center gap-1"
                          >
                            <span>🔑 Reset Password</span>
                          </button>

                          <button
                            onClick={() => onSwitchUser(u)}
                            title="Switch active logged in user profile"
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                              isCurrentActive
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                            }`}
                          >
                            {isCurrentActive ? '✓ Active' : '🔁 Switch'}
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(u)}
                            title="Edit Permissions & Role"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                            ✏️
                          </button>

                          {u.email !== 'rohit.digitalmarketing19@gmail.com' && (
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete user ${u.name}?`)) {
                                  onDeleteUser(u.id);
                                }
                              }}
                              title="Delete User Account"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl border border-slate-100 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <span>{editingUser ? '✏️ Edit User & Permissions' : '➕ Create New Team User'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure user credentials, role access rights, and password settings
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold transition-all"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-2xl text-xs font-bold border border-red-200">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Sharma"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. vikram.ops@kingslandholidays.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 7014939068"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Account Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-xs font-mono font-bold outline-none focus:border-indigo-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 hover:text-slate-600 px-1"
                    >
                      {showPassword ? '🙈 Hide' : '👁️ Show'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                  >
                    <option value="Active">● Active</option>
                    <option value="Inactive">○ Inactive</option>
                  </select>
                </div>
              </div>

              {/* Access Mode Selector: Editor vs View-Only */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">User Access Level / Permissions Mode *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, accessLevel: 'Editor' })}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      formData.accessLevel === 'Editor'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold shadow-sm ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-medium'
                    }`}
                  >
                    <span className="text-base">✏️</span>
                    <div>
                      <span className="text-xs font-black block">Editor Access</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">Can edit, create & update records</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, accessLevel: 'ViewOnly' })}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      formData.accessLevel === 'ViewOnly'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold shadow-sm ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-medium'
                    }`}
                  >
                    <span className="text-base">👁️</span>
                    <div>
                      <span className="text-xs font-black block">View Only (Read-Only)</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">Strictly view mode (cannot edit or delete)</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Role Presets */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Select Role & Quick Presets</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => applyRolePreset('Sales')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      formData.role === 'Sales'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-bold shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-sm block">💼 Sales</span>
                    <span className="text-[10px] text-slate-400 block font-normal">Leads & Quotes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyRolePreset('Operations')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      formData.role === 'Operations'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-bold shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-sm block">🚗 Operations</span>
                    <span className="text-[10px] text-slate-400 block font-normal">Vouchers & Trips</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyRolePreset('Accounts')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      formData.role === 'Accounts'
                        ? 'border-teal-500 bg-teal-50/50 text-teal-900 font-bold shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-sm block">💰 Accounts</span>
                    <span className="text-[10px] text-slate-400 block font-normal">Accounts & Invoices</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyRolePreset('Admin')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      formData.role === 'Admin'
                        ? 'border-purple-500 bg-purple-50/50 text-purple-900 font-bold shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-sm block">👑 Admin</span>
                    <span className="text-[10px] text-slate-400 block font-normal">All Sections</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'Custom' })}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      formData.role === 'Custom'
                        ? 'border-amber-500 bg-amber-50/50 text-amber-900 font-bold shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-sm block">⚙️ Custom</span>
                    <span className="text-[10px] text-slate-400 block font-normal">Manual Select</span>
                  </button>
                </div>
              </div>

              {/* Granular Section Access Grid */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Section Access Rights ({formData.permissions.length} Enabled)</h4>
                    <p className="text-[10px] text-slate-400">Toggle sections this user is allowed to access in the CRM sidebar</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, permissions: ALL_SECTIONS.map(s => s.id) })}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, permissions: [] })}
                      className="text-[10px] font-bold text-slate-400 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ALL_SECTIONS.map(sec => {
                    const isChecked = formData.permissions.includes(sec.id);
                    return (
                      <div
                        key={sec.id}
                        onClick={() => togglePermission(sec.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isChecked
                            ? 'border-indigo-500 bg-indigo-50/30 text-slate-900'
                            : 'border-slate-200 hover:border-slate-300 opacity-60 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by parent div
                          className="mt-0.5 accent-indigo-600 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black flex items-center gap-1.5">
                              <span>{sec.icon}</span>
                              <span>{sec.label}</span>
                            </span>
                            <span
                              className={`text-[8.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                sec.category === 'Admin'
                                  ? 'bg-purple-100 text-purple-700'
                                  : sec.category === 'Operations'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : sec.category === 'Sales'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {sec.category}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{sec.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-200 transition-all"
                >
                  {isSubmitting ? 'Saving...' : editingUser ? 'Update User Account' : 'Create User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN OTP PASSWORD RESET MODAL */}
      {isOtpModalOpen && otpTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <span>🔑 Admin OTP Password Reset</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Resetting password for: <strong className="text-amber-300">{otpTargetUser.name}</strong> ({otpTargetUser.email})
                </p>
              </div>
              <button
                onClick={() => setIsOtpModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPasswordReset} className="p-6 space-y-4">
              {otpMsg && (
                <div className={`p-3.5 rounded-2xl text-xs font-bold border ${
                  otpMsg.includes('✅') || otpMsg.includes('🎉')
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}>
                  {otpMsg}
                </div>
              )}

              {/* Step 1: Admin Email Info & Send OTP */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Admin Email Authorization</span>
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>📧 OTP Target:</span>
                  <span className="font-mono text-indigo-700">rohit.digitalmarketing19@gmail.com</span>
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  A 6-digit OTP code is sent to the primary Admin email to authorize changing account passwords.
                </p>

                <button
                  type="button"
                  onClick={handleSendAdminOtp}
                  disabled={isSendingOtp || otpCountdown > 0}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>{isSendingOtp ? 'Sending OTP...' : otpCountdown > 0 ? `Resend OTP in ${otpCountdown}s` : '📩 Send 6-Digit OTP to Admin Email'}</span>
                </button>
              </div>

              {/* Step 2: New Password & OTP Code Entry */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">New Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter new password for user"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">6-Digit Admin OTP Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit OTP code"
                    value={otpCodeInput}
                    onChange={e => setOtpCodeInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base font-mono font-black text-center tracking-widest text-indigo-700 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOtpModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isVerifyingOtp || !otpSent}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-100 transition-all disabled:opacity-50"
                >
                  {isVerifyingOtp ? 'Verifying & Updating...' : '🔑 Verify OTP & Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
