'use client';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, User, ShieldCheck, Mail, Building2, Save,
  CheckCircle2, KeyRound, AlertCircle, Check,
  Lock
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { checkPasswordStrength } from '@/lib/validators';
import PasswordStrengthMeter from '@/components/auth/PasswordStrengthMeter';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const DEPARTMENTS = [
  'BSIT - Information Technology',
  'BSCS - Computer Science',
  'BSIS - Information Systems',
  'BSCpE - Computer Engineering',
  'BSEE - Electrical Engineering',
  'BSECE - Electronics Engineering',
  'Undergraduate Engineering',
  'College of Computer Studies',
  'College of Technology Management',
  'College of Science',
  'Institute of Pharmacy',
  'College of Allied Health Studies',
  'College of Business and Financial Science',
  'College of Education',
  'Campus Infrastructure & Operations',
  'Other / Department Not Listed',
];

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'profile' | 'security';
}

export default function ProfileSettingsModal({
  isOpen,
  onClose,
  initialTab = 'profile',
}: ProfileSettingsModalProps) {
  const { user, role, updateProfile, toggleLoginOtp, updateNewPassword } = useAuth();
  const toast = useToast();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>(initialTab);

  // Profile Form States (Focusing strictly on Full Name and Department)
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [customDept, setCustomDept] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security Form States
  const [loginOtpEnabled, setLoginOtpEnabled] = useState(false);
  const [isTogglingOtp, setIsTogglingOtp] = useState(false);

  // Password Change States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync state whenever user or modal opens
  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      const userDept = user.department || 'BSIT - Information Technology';
      const matched = DEPARTMENTS.find(
        d => d.toLowerCase() === userDept.toLowerCase() || d.startsWith(userDept + ' ')
      );
      if (matched) {
        setDepartment(matched);
        setCustomDept('');
      } else {
        setDepartment('Other / Department Not Listed');
        setCustomDept(userDept);
      }
      setLoginOtpEnabled(!!user.requireLoginOtp);
    }
  }, [user, isOpen]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  // Avatar initials helper
  const getInitials = (str: string) => {
    const parts = (str || '').trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (str || 'US').substring(0, 2).toUpperCase();
  };

  const currentInitials = getInitials(fullName || user?.name || 'User');

  // Handle Save Profile Details (Full Name & Department)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Invalid Name', 'Full name cannot be left empty.');
      return;
    }

    const finalDept =
      department === 'Other / Department Not Listed'
        ? (customDept.trim() || 'General Studies')
        : department;

    setIsSavingProfile(true);
    try {
      await updateProfile({
        name: fullName.trim(),
        department: finalDept,
        avatar: currentInitials,
      });

      toast.success('Profile Updated', 'Your full name and department have been saved successfully.');
    } catch (err: any) {
      toast.error('Save Failed', err?.message || 'Could not update profile details.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Toggle Login OTP On/Off
  const handleToggleOtp = async () => {
    const newState = !loginOtpEnabled;
    setIsTogglingOtp(true);
    try {
      await toggleLoginOtp(newState);
      setLoginOtpEnabled(newState);
      if (newState) {
        toast.success(
          'Login OTP Enabled',
          'A 6-digit verification code will now be required every time you sign in.'
        );
      } else {
        toast.info(
          'Login OTP Disabled',
          'Standard password sign-in is now active for your account.'
        );
      }
    } catch (err: any) {
      toast.error('Update Failed', err?.message || 'Failed to update Login OTP settings.');
    } finally {
      setIsTogglingOtp(false);
    }
  };

  // Handle Change Password
  const pwdStrength = checkPasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (pwdStrength.score < 3) {
      setPasswordError('Please choose a stronger password matching the security criteria.');
      return;
    }

    if (!passwordsMatch) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await updateNewPassword(newPassword, user?.email);
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password Changed', 'Your account password was updated successfully.');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: any) {
      const msg = err?.message || 'Failed to update password. Please try again.';
      setPasswordError(msg);
      toast.error('Password Update Failed', msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
              {currentInitials}
            </div>
            <div>
              <h2 id="profile-modal-title" className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Account & Security Settings
              </h2>
              <p className="text-[11px] text-slate-400 truncate max-w-[240px] sm:max-w-xs">
                {user?.email || 'authenticated@umak.edu.ph'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'profile'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-t-lg'
            }`}
          >
            <User size={13} />
            <span>Profile Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'security'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-t-lg'
            }`}
          >
            <ShieldCheck size={13} />
            <span>Security & Login OTP</span>
            {loginOtpEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === 'profile' ? (
            /* TAB 1: Profile Details (Full Name & Department) */
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Header Badge */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                    {currentInitials}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-100">{fullName || user?.name || 'User'}</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Mail size={11} className="text-slate-500" />
                      {user?.email}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {role}
                </span>
              </div>

              {/* Input: Full Name */}
              <div className="space-y-1">
                <label htmlFor="modal-fullname" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <User size={12} className="text-indigo-400" />
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  id="modal-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g., Jeff Justine Geraga"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-colors"
                />
                <p className="text-[10px] text-slate-400">
                  Your full name displayed on loaners, workstations, and helpdesk tickets.
                </p>
              </div>

              {/* Input: Department */}
              <div className="space-y-1">
                <label htmlFor="modal-department" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Building2 size={12} className="text-indigo-400" />
                  Department / College <span className="text-rose-400">*</span>
                </label>
                <select
                  id="modal-department"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-colors cursor-pointer"
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d} className="bg-slate-900 text-slate-100">
                      {d}
                    </option>
                  ))}
                </select>

                {department === 'Other / Department Not Listed' && (
                  <div className="mt-2 animate-fade-in">
                    <input
                      type="text"
                      value={customDept}
                      onChange={e => setCustomDept(e.target.value)}
                      placeholder="Specify your department or program (e.g., BSIT)..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-indigo-500/50 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-colors"
                    />
                  </div>
                )}
                <p className="text-[10px] text-slate-400">
                  Select the academic department or campus unit associated with your account.
                </p>
              </div>

              {/* Readonly: Email Verified Indicator */}
              <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={12} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-200">University Email</p>
                    <p className="text-[10px] text-slate-400 font-mono">{user?.email}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                  <Check size={9} />
                  Verified Domain
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] shadow-glow-indigo transition-all disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <>
                      <LoadingSpinner size={14} />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save size={13} />
                      <span>Save Profile Details</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* TAB 2: Security & Login OTP */
            <div className="space-y-4">
              {/* ── Feature: On / Off Button for Login OTP Code ── */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/30 shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      loginOtpEnabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-100">
                          Require OTP Code on Every Login
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          loginOtpEnabled
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${loginOtpEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                          {loginOtpEnabled ? 'Active (Protected)' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        When enabled, a 6-digit verification code will be sent to your <strong className="text-slate-200">{user?.email}</strong> address every time you log in.
                      </p>
                    </div>
                  </div>

                  {/* Tactile On / Off Switch Button */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={loginOtpEnabled}
                    disabled={isTogglingOtp}
                    onClick={handleToggleOtp}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                      loginOtpEnabled
                        ? 'bg-emerald-600 border-emerald-500 shadow-glow-emerald/30'
                        : 'bg-slate-800 border-slate-700'
                    } ${isTogglingOtp ? 'opacity-50 cursor-wait' : ''}`}
                    aria-label="Toggle Login OTP Verification"
                  >
                    <span
                      className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        loginOtpEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* ── Change Password Section ── */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound size={14} className="text-indigo-400" />
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Change Password
                  </h3>
                </div>

                {passwordSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 size={13} className="flex-shrink-0" />
                    <span>Password updated successfully!</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2 animate-fade-in">
                    <AlertCircle size={13} className="flex-shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">New Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 16 chars)"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                    />
                  </div>

                  {newPassword.length > 0 && (
                    <PasswordStrengthMeter password={newPassword} />
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Confirm New Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? 'Hide Passwords' : 'Show Passwords'}
                    </button>

                    <button
                      type="submit"
                      disabled={isChangingPassword || !passwordsMatch || pwdStrength.score < 3}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-40 transition-all flex items-center gap-1.5"
                    >
                      {isChangingPassword ? (
                        <>
                          <LoadingSpinner size={14} />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <span>Update Password</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Session / Security Info */}
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-[10px] text-slate-400 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span>Session Encryption:</span>
                  <span className="text-slate-200 font-mono">AES-256-GCM / TLS 1.3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Lockout Protection:</span>
                  <span className="text-emerald-400">Active (6 Attempts / 15m Lock)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
