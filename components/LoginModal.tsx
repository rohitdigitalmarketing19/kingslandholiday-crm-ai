import React, { useState } from 'react';
import { Shield, Key, Mail, Lock, CheckCircle2, ArrowRight, UserCheck, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { UserAccount } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  users,
  onLoginSuccess,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'forgot'>('login');
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('rohit.digitalmarketing19@gmail.com');
  const [emailInput, setEmailInput] = useState<string>('rohit.digitalmarketing19@gmail.com');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Forgot password OTP states
  const [resetTargetUser, setResetTargetUser] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [otpCodeInput, setOtpCodeInput] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpCountdown, setOtpCountdown] = useState<number>(0);
  const [otpMsg, setOtpMsg] = useState<string>('');
  const [otpPreview, setOtpPreview] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Countdown timer for resend OTP
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  if (!isOpen) return null;

  // Handle User Select dropdown change
  const handleUserSelect = (userEmail: string) => {
    setSelectedUserEmail(userEmail);
    setEmailInput(userEmail);
    const found = users.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
    if (found) {
      setPasswordInput(found.password || 'kingsland123');
    }
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!passwordInput.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');

      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim(), password: passwordInput.trim() })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials.');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Request Admin OTP
  const handleSendAdminOtp = async () => {
    try {
      setIsLoading(true);
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
      setOtpCountdown(60);
      setOtpMsg(data.emailSent ? `✅ 6-Digit OTP Code emailed to rohit.digitalmarketing19@gmail.com!` : `✅ 6-Digit OTP requested! Please check the Admin Email inbox.`);
    } catch (err: any) {
      setOtpMsg(`⚠️ ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm OTP Password Reset
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = resetTargetUser || users.find(u => u.email.toLowerCase() === emailInput.toLowerCase()) || users[0];
    if (!targetUser) {
      setOtpMsg('⚠️ Please select a user account to reset.');
      return;
    }

    if (!newPassword || newPassword.trim().length < 4) {
      setOtpMsg('⚠️ New password must be at least 4 characters long.');
      return;
    }

    if (!otpCodeInput || otpCodeInput.trim().length !== 6) {
      setOtpMsg('⚠️ Please enter the 6-digit OTP code.');
      return;
    }

    try {
      setIsLoading(true);
      setOtpMsg('');

      const res = await fetch(`/api/users/${targetUser.id}/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPassword.trim(), otpCode: otpCodeInput.trim() })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify OTP & reset password.');
      }

      setOtpMsg(`🎉 Password updated! You can now log in with your new password.`);
      setPasswordInput(newPassword.trim());
      setTimeout(() => {
        setActiveTab('login');
      }, 1500);
    } catch (err: any) {
      setOtpMsg(`⚠️ ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Branding */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-white/20 shadow-lg">
            🏰
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">Kingsland Holidays CRM</h2>
          <p className="text-xs text-indigo-200 font-medium mt-1">Authorized Staff & Sales Portal Access</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${activeTab === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>Staff Login</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('forgot'); setOtpMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${activeTab === 'forgot' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Key className="w-4 h-4 text-amber-500" />
            <span>Admin OTP Reset</span>
          </button>
        </div>

        {/* LOGIN FORM */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-5">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Quick Profile Selector */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Quick Profile Selector</label>
              <select
                value={selectedUserEmail}
                onChange={e => handleUserSelect(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
              >
                {users.map(u => (
                  <option key={u.id} value={u.email}>
                    {u.name} ({u.role}) — {u.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@kingslandholidays.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Password *</label>
                <button
                  type="button"
                  onClick={() => setActiveTab('forgot')}
                  className="text-[10px] text-indigo-600 font-bold hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter account password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <span>Sign In to CRM Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* FORGOT / OTP RESET FORM */}
        {activeTab === 'forgot' && (
          <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
            {otpMsg && (
              <div className={`p-3.5 rounded-2xl text-xs font-bold border ${otpMsg.includes('✅') || otpMsg.includes('🎉') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-200'}`}>
                {otpMsg}
              </div>
            )}

            {/* Select User to Reset */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Select User Account to Reset *</label>
              <select
                value={resetTargetUser?.id || users[0]?.id}
                onChange={e => {
                  const target = users.find(u => u.id === e.target.value);
                  setResetTargetUser(target || null);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}) — {u.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Admin OTP Trigger Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Admin Email Authorization</span>
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>📧 Admin Inbox:</span>
                <span className="font-mono text-indigo-700">rohit.digitalmarketing19@gmail.com</span>
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Click below to send a 6-digit OTP code to the primary Admin email to authorize password reset.
              </p>
              
              <button
                type="button"
                onClick={handleSendAdminOtp}
                disabled={isLoading || otpCountdown > 0}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Sending OTP...' : otpCountdown > 0 ? `Resend OTP in ${otpCountdown}s` : '📩 Get 6-Digit OTP Code'}</span>
              </button>
            </div>

            {/* New Password & OTP Code Entry */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">New Password *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter new password"
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

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !otpCodeInput}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-100 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Verifying & Updating...' : '🔑 Verify OTP & Update Password'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
