import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Key, ArrowLeft, RefreshCw, CheckCircle2, AlertTriangle, Shield } from 'lucide-react';
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
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  
  // Login State
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [otpCodeInput, setOtpCodeInput] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpCountdown, setOtpCountdown] = useState<number>(0);
  const [otpStatusMsg, setOtpStatusMsg] = useState<string>('');
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);

  // OTP Countdown
  useEffect(() => {
    let timer: any;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  if (!isOpen) return null;

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }
    if (!passwordInput.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim(), password: passwordInput.trim() })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid email or password.');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Send Admin OTP Handler
  const handleSendAdminOtp = async () => {
    if (!forgotEmail.trim()) {
      setOtpStatusMsg('⚠️ Please enter your registered account email first.');
      return;
    }

    try {
      setIsSendingOtp(true);
      setOtpStatusMsg('');

      const res = await fetch('/api/users/send-admin-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP.');
      }

      setOtpSent(true);
      setOtpCountdown(60);
      setOtpStatusMsg(data.message || '✓ 6-Digit Security OTP sent. Please check your Admin Gmail inbox.');
    } catch (err: any) {
      setOtpStatusMsg(`⚠️ ${err.message}`);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Reset Password Handler
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setOtpStatusMsg('⚠️ Please enter your account email.');
      return;
    }
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setOtpStatusMsg('⚠️ New password must be at least 4 characters long.');
      return;
    }
    if (!otpCodeInput.trim() || otpCodeInput.trim().length !== 6) {
      setOtpStatusMsg('⚠️ Please enter the 6-digit OTP code received from the admin.');
      return;
    }

    try {
      setIsResettingPassword(true);
      setOtpStatusMsg('');

      const res = await fetch(`/api/users/${encodeURIComponent(forgotEmail.trim())}/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: newPassword.trim(),
          otpCode: otpCodeInput.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      // Switch back to login with new password pre-filled
      setEmailInput(forgotEmail.trim());
      setPasswordInput(newPassword.trim());
      setSuccessMsg('✓ Password reset successfully! Please sign in with your new password.');
      setMode('login');
      setErrorMsg('');
    } catch (err: any) {
      setOtpStatusMsg(`⚠️ ${err.message}`);
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-inverse/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface w-full max-w-md rounded-xl shadow-sm border border-line/60 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Branding */}
        <div className="bg-gradient-to-br from-line via-line to-line text-white px-8 pt-7 pb-6 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="w-11 h-11 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-lg mx-auto mb-3 border border-white/10 shadow-sm">
            <span className="font-bold text-white tracking-tight">K</span>
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-white">Kingsland Holidays CRM</h2>
          <p className="text-sm text-muted font-medium mt-0.5">
            {mode === 'login' ? 'Secure Staff Sign-In' : 'Admin OTP Password Recovery'}
          </p>
        </div>

        {/* MODE: PASSWORD LOGIN */}
        {mode === 'login' && (
          <div>
            <form onSubmit={handleLoginSubmit} className="px-8 pb-7 pt-5 space-y-4">
              {successMsg && (
                <div className="p-3 bg-success-soft border border-success-line text-success-ink rounded-lg text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0 text-success-ink" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-danger-soft border border-danger-line text-danger-ink rounded-lg text-sm font-medium flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0 text-danger-ink" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@kingslandholidays.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className="w-full bg-canvas border border-line rounded-lg pl-9 pr-3 py-2.5 text-sm font-medium text-content outline-none focus:border-brand-line focus:bg-surface transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-secondary">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(emailInput);
                      setErrorMsg('');
                      setSuccessMsg('');
                      setOtpStatusMsg('');
                      setMode('forgot');
                    }}
                    className="text-xs font-medium text-brand-ink hover:text-brand-ink hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="w-full bg-canvas border border-line rounded-lg pl-9 pr-9 py-2.5 text-sm font-mono font-medium text-content outline-none focus:border-brand-line focus:bg-surface transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-brand hover:bg-brand text-white rounded-lg text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <p className="text-xs text-muted text-center pt-2">
                Authorized staff access only. Activity is monitored and logged.
              </p>
            </form>
          </div>
        )}

        {/* MODE: FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <div>
            <div className="px-8 pt-5 pb-1 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-content flex items-center gap-1.5">
                  <Key size={14} className="text-warning-ink" />
                  <span>Reset Password</span>
                </h3>
                <p className="text-sm text-muted mt-0.5">Authorize password reset via Admin Security OTP.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setMode('login');
                }}
                className="text-xs font-medium text-secondary hover:text-content flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={12} />
                <span>Back to Login</span>
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="px-8 pb-7 pt-3 space-y-3.5">
              {otpStatusMsg && (
                <div className={`p-3 rounded-lg text-sm font-medium border flex items-start gap-2 ${
                  otpStatusMsg.includes('✓')
                    ? 'bg-success-soft text-success-ink border-success-line'
                    : 'bg-warning-soft text-warning-ink border-warning-line'
                }`}>
                  {otpStatusMsg.includes('✓') ? (
                    <CheckCircle2 size={14} className="text-success-ink shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={14} className="text-warning-ink shrink-0 mt-0.5" />
                  )}
                  <span className="leading-snug">{otpStatusMsg}</span>
                </div>
              )}

              {/* Account Email */}
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Your Account Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@kingslandholidays.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="w-full bg-canvas border border-line rounded-lg pl-9 pr-3 py-2 text-sm font-medium text-content outline-none focus:border-brand-line focus:bg-surface transition-all"
                  />
                </div>
              </div>

              {/* Admin OTP Authorization Box */}
              <div className="p-3 bg-canvas rounded-xl border border-line space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-secondary">Admin Authorization OTP</span>
                  <span className="text-xs text-muted font-medium">(Check your admin Gmail)</span>
                </div>

                <button
                  type="button"
                  onClick={handleSendAdminOtp}
                  disabled={isSendingOtp || otpCountdown > 0}
                  className="w-full py-2 bg-inverse hover:bg-inverse text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
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

              {/* New Password & 6-Digit OTP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Min 4 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full bg-canvas border border-line rounded-lg pl-3 pr-8 py-2 text-sm font-mono font-medium outline-none focus:border-brand-line focus:bg-surface"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-secondary"
                    >
                      {showNewPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">6-Digit OTP Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 123456"
                    value={otpCodeInput}
                    onChange={e => setOtpCodeInput(e.target.value)}
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-mono font-bold text-center tracking-widest text-brand-ink outline-none focus:border-brand-line focus:bg-surface"
                  />
                </div>
              </div>

              {/* Submit Reset */}
              <button
                type="submit"
                disabled={isResettingPassword || !otpSent || !otpCodeInput}
                className="w-full py-2.5 bg-success-strong hover:bg-success-strong text-white rounded-lg text-sm font-medium shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-1"
              >
                {isResettingPassword ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Verify OTP & Update Password</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
