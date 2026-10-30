import React, { useState, useEffect } from 'react';
import { UserAccount, UserRole, UserPermissionSection } from '../types';
import { 
  Shield, 
  Key, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  AlertTriangle,
  UserCheck,
  Building,
  Sliders,
  Send
} from 'lucide-react';

interface UserManagementViewProps {
  users: UserAccount[];
  currentUser: UserAccount;
  onAddUser: (user: Partial<UserAccount>) => Promise<void>;
  onUpdateUser: (id: string, user: Partial<UserAccount>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onSwitchUser?: (user: UserAccount) => void;
}

const ALL_SECTIONS: { id: UserPermissionSection; label: string; desc: string; category: 'General' | 'Sales' | 'Operations' | 'Admin' }[] = [
  { id: 'Dashboard', label: 'Executive Dashboard', desc: 'KPI cards, monthly graphs, and overall business overview', category: 'General' },
  { id: 'Sales Desk', label: 'Sales Desk', desc: 'Representative lead desk, assigned client pipeline, and quote actions', category: 'Sales' },
  { id: 'Leads', label: 'Leads Pipeline', desc: 'Manage lead cards, stages, statuses, and inquiry details', category: 'Sales' },
  { id: 'New Inquiry', label: 'Create New Inquiry', desc: 'Form to submit and parse new client travel inquiries', category: 'Sales' },
  { id: 'Follow-ups', label: 'Follow-ups & Reminders', desc: 'Scheduled client call logs, post-poned date filters, touchpoints', category: 'Sales' },
  { id: 'Saved Itinerary', label: 'Itinerary Library', desc: 'Pre-built package itineraries and day-wise templates', category: 'Sales' },
  { id: 'HotelVouchers', label: 'Hotel Voucher Desk', desc: 'Hotel-side voucher uploads, hotel email dispatch, confirmation tracker', category: 'Operations' },
  { id: 'Operations', label: 'Operations Portal', desc: 'Trip execution, cab drivers, day-wise itineraries, customer readiness', category: 'Operations' },
  { id: 'Payments', label: 'Payment Management', desc: 'Generate payment links, part-payment installments, UTR verification', category: 'Admin' },
  { id: 'Accounts', label: 'Accounts & Audit', desc: 'Hotel/Cab 2-part disbursement logs, monthly lead filtering, revenue', category: 'Admin' },
  { id: 'Invoices', label: 'Tax & Package Invoices', desc: 'Generate & view tax invoices, GST breakdowns, customer receipts', category: 'Admin' },
  { id: 'Analytics', label: 'Analytics & Reports', desc: 'Conversion rates, destination breakdown, revenue metrics', category: 'Sales' },
  { id: 'Sales Team', label: 'Sales Team Management', desc: 'Assign leads to sales representatives, track performance', category: 'Admin' },
  { id: 'User Management', label: 'User & Permission Management', desc: 'Create users, assign roles, configure section access rights', category: 'Admin' }
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
    password: '',
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
      password: '',
      role: 'Sales',
      department: 'Sales',
      status: 'Active',
      accessLevel: 'Editor',
      permissions: ['Dashboard', 'Sales Desk', 'Leads', 'New Inquiry', 'Follow-ups', 'Saved Itinerary', 'Analytics']
    });
    setErrorMsg('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (u: UserAccount) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      password: '',
      role: u.role,
      department: u.department || 'Sales',
      status: u.status,
      accessLevel: u.accessLevel || 'Editor',
      permissions: u.permissions || []
    });
    setErrorMsg('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // Open OTP Password Reset Modal for a target user
  const handleOpenOtpResetModal = (u: UserAccount) => {
    setOtpTargetUser(u);
    setNewPassword('');
    setOtpCodeInput('');
    setOtpSent(false);
    setOtpMsg('');
    setOtpCountdown(0);
    setIsOtpModalOpen(true);
  };

  // Trigger Send OTP to Admin Email
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
        throw new Error('Backend API is unreachable. Ensure the backend server is running.');
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP.');
      }

      setOtpSent(true);
      setOtpCountdown(60);
      setOtpMsg(data.message || '✓ 6-Digit Security OTP sent. Please check your Admin Gmail inbox.');
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

      // Update local state
      await onUpdateUser(otpTargetUser.id, { password: newPassword.trim() });
      alert(`✓ Password successfully updated for ${otpTargetUser.name}!`);
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
        newPermissions = ['Dashboard', 'Sales Desk', 'Leads', 'New Inquiry', 'Follow-ups', 'Saved Itinerary', 'Analytics'];
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

  // Form Submit (Create or Update)
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
      setErrorMsg(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchQuery || 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery));
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-ink" />
            <h2 className="text-xl font-semibold text-content">User & Permission Management</h2>
          </div>
          <p className="text-sm text-secondary mt-1">
            Manage team accounts, grant permissions, and authorize password resets.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-brand hover:bg-brand text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus size={15} />
          <span>Add New User</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface p-4 rounded-xl border border-line shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-canvas border border-line rounded-lg text-sm font-medium text-content outline-none focus:bg-surface focus:border-brand-line focus:ring-2 focus:ring-brand-line/10 transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-medium text-content outline-none focus:border-brand-line cursor-pointer"
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
            className="bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-medium text-content outline-none focus:border-brand-line cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-surface rounded-xl border border-line shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-canvas border-b border-line text-xs font-semibold text-secondary uppercase tracking-wider">
                <th className="py-3.5 px-5">Team Member</th>
                <th className="py-3.5 px-4">Role & Access</th>
                <th className="py-3.5 px-4">Password</th>
                <th className="py-3.5 px-4">Permissions ({ALL_SECTIONS.length})</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted font-medium">
                    No team users found matching filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const isCurrentActive = currentUser.id === u.id;
                  return (
                    <tr key={u.id} className={`hover:bg-canvas/60 transition-colors ${isCurrentActive ? 'bg-brand-soft/20' : ''}`}>
                      {/* User Info */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-inverse text-white flex items-center justify-center text-sm font-semibold shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-content flex items-center gap-1.5">
                              {u.name}
                              {u.email === 'rohit.digitalmarketing19@gmail.com' && (
                                <span className="text-xs bg-warning-soft text-warning-ink font-medium px-1.5 py-0.5 rounded border border-warning-line">Primary Admin</span>
                              )}
                              {isCurrentActive && (
                                <span className="text-xs bg-brand-soft text-brand-ink font-medium px-1.5 py-0.5 rounded border border-brand-line">Current Session</span>
                              )}
                            </div>
                            <div className="text-xs text-secondary">{u.email}</div>
                            {u.phone && <div className="text-xs text-muted font-mono">{u.phone}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Role & Access Mode */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                                u.role === 'Admin'
                                  ? 'bg-brand-soft text-brand-ink border border-brand-line'
                                  : u.role === 'Operations'
                                  ? 'bg-success-soft text-success-ink border border-success-line'
                                  : u.role === 'Accounts'
                                  ? 'bg-success-soft text-success-ink border border-success-line'
                                  : u.role === 'Sales'
                                  ? 'bg-brand-soft text-brand-ink border border-brand-line'
                                  : 'bg-subtle text-content border border-line'
                              }`}
                            >
                              {u.role}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              u.accessLevel === 'ViewOnly'
                                ? 'bg-warning-soft text-warning-ink border border-warning-line'
                                : 'bg-subtle text-secondary border border-line'
                            }`}>
                              {u.accessLevel === 'ViewOnly' ? 'View Only' : 'Editor'}
                            </span>
                          </div>
                          <div className="text-xs text-muted">{u.department || 'General'}</div>
                        </div>
                      </td>

                      {/* Real Password Display */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-canvas rounded border border-line font-mono text-xs text-content">
                          <Lock size={11} className="text-muted" />
                          <span>Password hidden</span>
                        </div>
                      </td>

                      {/* Permissions */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-content block">
                            {u.role === 'Admin' || u.permissions.length === ALL_SECTIONS.length ? (
                              <span className="text-brand-ink font-semibold">Full Access ({ALL_SECTIONS.length} Sections)</span>
                            ) : (
                              <span>{u.permissions.length} of {ALL_SECTIONS.length} Allowed</span>
                            )}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {u.permissions.slice(0, 3).map(pId => (
                              <span key={pId} className="text-xs bg-subtle text-secondary px-1.5 py-0.5 rounded font-medium">
                                {pId}
                              </span>
                            ))}
                            {u.permissions.length > 3 && (
                              <span className="text-xs bg-brand-soft text-brand-ink px-1.5 py-0.5 rounded font-medium">
                                +{u.permissions.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onUpdateUser(u.id, { status: u.status === 'Active' ? 'Inactive' : 'Active' })}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                            u.status === 'Active'
                              ? 'bg-success-soft text-success-ink border border-success-line hover:bg-success-soft'
                              : 'bg-subtle text-secondary border border-line hover:bg-hover'
                          }`}
                        >
                          {u.status === 'Active' ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenOtpResetModal(u)}
                            title="Reset password via Admin OTP"
                            className="px-2.5 py-1 bg-warning-soft hover:bg-warning-soft text-warning-ink rounded-lg text-xs font-medium border border-warning-line transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Key size={12} />
                            <span>Reset Password</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(u)}
                            title="Edit User"
                            className="p-1.5 text-secondary hover:text-brand-ink hover:bg-brand-soft rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 size={14} />
                          </button>

                          {u.email !== 'rohit.digitalmarketing19@gmail.com' && (
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete user ${u.name}?`)) {
                                  onDeleteUser(u.id);
                                }
                              }}
                              title="Delete User"
                              className="p-1.5 text-muted hover:text-danger-ink hover:bg-danger-soft rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
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

      {/* CREATE / EDIT USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-inverse/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface w-full max-w-xl rounded-xl shadow-sm border border-line overflow-hidden animate-in zoom-in-95 duration-200 my-8">
            <div className="bg-inverse text-white px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">
                  {editingUser ? `Edit User: ${editingUser.name}` : 'Create New Team Member'}
                </h3>
                <p className="text-sm text-muted mt-0.5">
                  Configure account credentials, department, and section permissions.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-inverse transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {errorMsg && (
                <div className="p-3 bg-danger-soft border border-danger-line text-danger-ink rounded-lg text-sm font-medium flex items-center gap-2">
                  <AlertTriangle size={14} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-brand-line focus:bg-surface transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@kingslandholidays.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-brand-line focus:bg-surface transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 00000 00000"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-brand-line focus:bg-surface transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Account Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Set account password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-canvas border border-line rounded-lg pl-3 pr-9 py-2 text-sm font-mono font-medium outline-none focus:border-brand-line focus:bg-surface transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-secondary"
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Role Preset */}
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Role Preset</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Admin', 'Sales', 'Operations', 'Accounts'] as UserRole[]).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => applyRolePreset(r)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                        formData.role === r
                          ? 'bg-brand-soft border-brand-line text-brand-ink shadow-xs'
                          : 'bg-canvas border-line text-content hover:bg-subtle'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions Checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-secondary">
                    Section Access Permissions ({formData.permissions.length} of {ALL_SECTIONS.length})
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, permissions: ALL_SECTIONS.map(s => s.id) })}
                      className="text-brand-ink hover:underline font-medium"
                    >
                      Select All
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, permissions: [] })}
                      className="text-muted hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-canvas p-3 rounded-xl border border-line max-h-48 overflow-y-auto custom-scrollbar">
                  {ALL_SECTIONS.map(sec => {
                    const isChecked = formData.permissions.includes(sec.id);
                    return (
                      <label
                        key={sec.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-all cursor-pointer ${
                          isChecked 
                            ? 'bg-surface border-brand-line text-content shadow-2xs' 
                            : 'bg-white/50 border-transparent text-secondary'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(sec.id)}
                          className="rounded text-brand-ink focus:ring-brand-line"
                        />
                        <span className="font-medium truncate">{sec.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-subtle hover:bg-hover text-content text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-brand hover:bg-brand text-white rounded-lg text-sm font-medium shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN OTP PASSWORD RESET MODAL */}
      {isOtpModalOpen && otpTargetUser && (
        <div className="fixed inset-0 z-50 bg-inverse/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-xl shadow-sm border border-line overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-inverse text-white px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Key size={16} className="text-warning-ink" />
                  <span>Admin OTP Password Reset</span>
                </h3>
                <p className="text-sm text-muted mt-0.5">
                  Resetting password for: <strong className="text-white">{otpTargetUser.name}</strong> ({otpTargetUser.email})
                </p>
              </div>
              <button
                onClick={() => setIsOtpModalOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-inverse transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmPasswordReset} className="p-6 space-y-4">
              {otpMsg && (
                <div className={`p-3 rounded-lg text-sm font-medium border ${
                  otpMsg.includes('✓')
                    ? 'bg-success-soft text-success-ink border-success-line'
                    : 'bg-warning-soft text-warning-ink border-warning-line'
                }`}>
                  {otpMsg}
                </div>
              )}

              {/* Step 1: Admin Authorization */}
              <div className="p-3.5 bg-canvas rounded-xl border border-line space-y-2">
                <span className="text-xs font-medium text-secondary block">Primary Admin Authorization</span>
                <p className="text-sm font-semibold text-content flex items-center gap-1.5">
                  <Mail size={13} className="text-brand-ink" />
                  <span className="font-medium text-brand-ink">(Check your admin Gmail)</span>
                </p>
                <p className="text-xs text-secondary">
                  Send a 6-digit OTP to the admin email to authorize resetting this staff password.
                </p>

                <button
                  type="button"
                  onClick={handleSendAdminOtp}
                  disabled={isSendingOtp || otpCountdown > 0}
                  className="w-full py-2 bg-inverse hover:bg-inverse text-white rounded-lg text-sm font-medium shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw size={12} className={isSendingOtp ? 'animate-spin' : ''} />
                  <span>
                    {isSendingOtp 
                      ? 'Sending OTP...' 
                      : otpCountdown > 0 
                      ? `Resend OTP in ${otpCountdown}s` 
                      : 'Send 6-Digit OTP to Admin Email'}
                  </span>
                </button>
              </div>

              {/* Step 2: New Password & OTP Code */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">New Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-mono font-medium outline-none focus:border-brand-line focus:bg-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">6-Digit Admin OTP Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit OTP code"
                    value={otpCodeInput}
                    onChange={e => setOtpCodeInput(e.target.value)}
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-mono font-bold text-center tracking-widest text-brand-ink outline-none focus:border-brand-line focus:bg-surface"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsOtpModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-subtle hover:bg-hover text-content text-sm font-medium transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isVerifyingOtp || !otpSent || !otpCodeInput}
                  className="px-4 py-2 bg-success-strong hover:bg-success-strong text-white rounded-lg text-sm font-medium shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 size={13} />
                  <span>{isVerifyingOtp ? 'Verifying...' : 'Verify & Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
