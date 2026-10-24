import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Crown,
  Lock,
  Mail,
  Eye,
  EyeOff,
  UserPlus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Users,
  KeyRound,
  ArrowRight,
  Loader2,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  loginUser,
  createAdminUser,
  fetchAdmins,
  deleteAdminUser,
  validateRegistrationFields,
  ApiValidationError,
  type AuthResponseDto,
  type AdminAccountDto,
  type RegisterFieldErrors,
  type RegisterFieldKey,
} from '../services/authApi';

interface OwnerPortalViewProps {
  session: AuthResponseDto | null;
  onSessionChange: (session: AuthResponseDto | null) => void;
}

export const OwnerPortalView: React.FC<OwnerPortalViewProps> = ({
  session,
  onSessionChange,
}) => {
  const isOwnerAuthenticated = Boolean(session && session.role === 'Owner');

  // Owner Login form state
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Admin Management state
  const [admins, setAdmins] = useState<AdminAccountDto[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);

  // Create New Sales Admin form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [city, setCity] = useState('Cairo');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [adminFieldErrors, setAdminFieldErrors] = useState<RegisterFieldErrors>({});
  const [adminTouched, setAdminTouched] = useState<Partial<Record<RegisterFieldKey, boolean>>>({});

  const updateAdminField = (
    field: RegisterFieldKey,
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setter(value);
    const nextValues = {
      firstName: field === 'firstName' ? value : firstName,
      lastName: field === 'lastName' ? value : lastName,
      email: field === 'email' ? value : adminEmail,
      phoneNo: field === 'phoneNo' ? value : phoneNo,
      city: field === 'city' ? value : city,
      password: field === 'password' ? value : adminPassword,
    };
    if (adminTouched[field] || adminFieldErrors[field]) {
      const computed = validateRegistrationFields(nextValues);
      setAdminFieldErrors((prev) => ({
        ...prev,
        [field]: computed[field],
      }));
    }
  };

  const handleAdminBlur = (field: RegisterFieldKey) => {
    setAdminTouched((prev) => ({ ...prev, [field]: true }));
    const computed = validateRegistrationFields({
      firstName,
      lastName,
      email: adminEmail,
      phoneNo,
      city,
      password: adminPassword,
    });
    setAdminFieldErrors((prev) => ({
      ...prev,
      [field]: computed[field],
    }));
  };

  const loadAdmins = useCallback(async () => {
    if (!session || session.role !== 'Owner') return;
    setLoadingAdmins(true);
    setErrorMsg(null);
    try {
      const list = await fetchAdmins(session.token, onSessionChange);
      setAdmins(list);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to load administrators.'
      );
    } finally {
      setLoadingAdmins(false);
    }
  }, [session, onSessionChange]);

  useEffect(() => {
    if (isOwnerAuthenticated) {
      loadAdmins();
    }
  }, [isOwnerAuthenticated, loadAdmins]);

  const passwordChecks = useMemo(() => {
    return [
      { label: '6+ chars', valid: adminPassword.length >= 6 },
      { label: 'Uppercase (A-Z)', valid: /[A-Z]/.test(adminPassword) },
      { label: 'Lowercase (a-z)', valid: /[a-z]/.test(adminPassword) },
      { label: 'Number (0-9)', valid: /[0-9]/.test(adminPassword) },
      { label: 'Symbol (@$!%*?&)', valid: /[^A-Za-z0-9]/.test(adminPassword) },
    ];
  }, [adminPassword]);

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const data = await loginUser({
        email: ownerEmail.trim(),
        password: ownerPassword,
      });

      if (data.role !== 'Owner') {
        setAuthError(
          'Access Denied: This portal is reserved exclusively for the Store Owner.'
        );
        return;
      }

      onSessionChange(data);
      localStorage.setItem('kf_owner_session', JSON.stringify(data));
      setOwnerPassword('');
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Invalid Owner credentials.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreateSalesAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || session.role !== 'Owner') return;

    setErrorMsg(null);
    setSuccessMsg(null);

    setAdminTouched({
      firstName: true,
      lastName: true,
      email: true,
      phoneNo: true,
      city: true,
      password: true,
    });

    const validationErrors = validateRegistrationFields({
      firstName,
      lastName,
      email: adminEmail,
      phoneNo,
      city,
      password: adminPassword,
    });

    if (Object.keys(validationErrors).length > 0) {
      setAdminFieldErrors(validationErrors);
      return;
    }

    setAdminFieldErrors({});
    setSubmittingAdmin(true);
    try {
      const created = await createAdminUser(
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: adminEmail.trim(),
          phoneNo: phoneNo.trim(),
          city: city.trim() || 'Cairo',
          password: adminPassword,
        },
        session.token,
        onSessionChange
      );

      setSuccessMsg(
        `Sales Administrator "${created.fullName}" (${created.email}) has been provisioned. They can now sign in at /admin.`
      );
      setFirstName('');
      setLastName('');
      setAdminEmail('');
      setPhoneNo('');
      setAdminPassword('');
      setAdminFieldErrors({});
      setAdminTouched({});
      await loadAdmins();
    } catch (err) {
      if (err instanceof ApiValidationError && Object.keys(err.fieldErrors).length > 0) {
        setAdminFieldErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      } else {
        setErrorMsg(
          err instanceof Error ? err.message : 'Failed to create Sales Admin.'
        );
      }
    } finally {
      setSubmittingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (admin: AdminAccountDto) => {
    if (!session || session.role !== 'Owner') return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setDeletingAdminId(admin.id);

    try {
      await deleteAdminUser(admin.id, session.token, onSessionChange);
      setSuccessMsg(`Revoked administrator access for "${admin.fullName}" (${admin.email}).`);
      await loadAdmins();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to remove administrator.'
      );
    } finally {
      setDeletingAdminId(null);
    }
  };

  const handleOwnerLogout = () => {
    onSessionChange(null);
    localStorage.removeItem('kf_owner_session');
    setOwnerEmail('');
    setOwnerPassword('');
  };

  /* =========================================================================
     VIEW 1: EXCLUSIVE OWNER LOGIN VAULT (/owner)
     ========================================================================= */
  if (!isOwnerAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-[#050507] text-[#F4F4F6] flex items-center justify-center p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        <img
          src="/kf-mark.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute w-[540px] max-w-[85vw] opacity-[0.03] object-contain"
        />

        <div className="relative z-10 w-full max-w-md bg-[#0A0B0F] border border-amber-400/25 p-8 sm:p-10 shadow-[0_30px_90px_rgba(0,0,0,0.95)] space-y-7">
          <div className="space-y-3 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-400/30 text-amber-300 font-display text-[10px] font-bold uppercase tracking-[0.24em]">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>EXCLUSIVE STORE OWNER PORTAL</span>
            </div>

            <div className="pt-2 flex justify-center">
              <img
                src="/kf-mark.svg"
                alt="KF"
                className="h-10 w-auto object-contain"
              />
            </div>

            <h1 className="font-brand text-2xl font-extrabold uppercase tracking-wider text-white pt-1">
              OWNER COMMAND VAULT
            </h1>
            <p className="text-xs text-[#8E92A4] leading-relaxed">
              Dedicated exclusively to the Store Owner for managing and
              provisioning Sales Administrator accounts.
            </p>
          </div>

          {authError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleOwnerLogin} className="space-y-5">
            <div>
              <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#9EA2B3] mb-2">
                OWNER EMAIL ADDRESS
              </label>
              <div className="relative flex items-center bg-[#11131A] border border-white/[0.14] focus-within:border-amber-400 transition">
                <Mail className="w-4 h-4 text-[#7D8091] ml-3.5 shrink-0" />
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@khalifawear.com"
                  className="w-full bg-transparent px-3.5 py-3.5 text-xs sm:text-sm text-white placeholder-[#555869] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#9EA2B3] mb-2">
                MASTER PASSWORD
              </label>
              <div className="relative flex items-center bg-[#11131A] border border-white/[0.14] focus-within:border-amber-400 transition">
                <Lock className="w-4 h-4 text-[#7D8091] ml-3.5 shrink-0" />
                <input
                  type={showOwnerPassword ? 'text' : 'password'}
                  required
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-transparent px-3.5 py-3.5 text-xs sm:text-sm text-white placeholder-[#555869] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowOwnerPassword((v) => !v)}
                  className="px-3.5 text-[#7D8091] hover:text-white transition cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showOwnerPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-[#060608] font-display text-xs font-extrabold uppercase tracking-[0.22em] flex items-center justify-center gap-2.5 transition cursor-pointer"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>VERIFYING OWNER CREDENTIALS...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>UNLOCK OWNER PORTAL</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-display uppercase tracking-[0.18em] text-[#686B7A]">
            <span>OWNER ACCESS POINT // /owner</span>
            <span>ENCRYPTED VAULT</span>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     VIEW 2: AUTHENTICATED OWNER — EXCLUSIVE ADMIN MANAGEMENT PORTAL
     ========================================================================= */
  const salesAdminsCount = admins.filter((a) => a.role !== 'Owner').length;

  return (
    <div className="min-h-screen w-full bg-[#050507] text-[#F4F4F6]">
      {/* Standalone Owner Top Header */}
      <header className="w-full bg-[#090A0F] border-b border-white/[0.1] px-6 sm:px-10 py-5">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/kf-mark.svg"
              alt="KF"
              className="h-8 w-auto object-contain"
            />
            <div className="h-7 w-[1px] bg-white/[0.12]" />
            <div>
              <div className="inline-flex items-center gap-1.5 text-amber-300 font-display text-[10px] font-bold uppercase tracking-[0.24em]">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>STORE OWNER GOVERNANCE PORTAL</span>
              </div>
              <h1 className="font-brand text-lg sm:text-xl font-extrabold uppercase tracking-wider text-white">
                ADMINISTRATION &amp; ACCESS CONTROL
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right pr-3 border-r border-white/[0.1]">
              <p className="font-brand text-xs font-bold uppercase tracking-wider text-white">
                {session?.fullName}
              </p>
              <p className="text-[11px] text-amber-300">{session?.email}</p>
            </div>
            <button
              type="button"
              onClick={loadAdmins}
              className="px-4 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-white font-display text-[10px] font-bold uppercase tracking-[0.18em] flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingAdmins ? 'animate-spin' : ''}`}
              />
              <span>REFRESH</span>
            </button>
            <button
              type="button"
              onClick={handleOwnerLogout}
              className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-200 font-display text-[10px] font-bold uppercase tracking-[0.18em] flex items-center gap-2 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>SIGN OUT</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1360px] mx-auto px-6 sm:px-10 py-10 space-y-8">
        {/* Executive Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-6 bg-[#0A0B0F] border border-amber-400/25 flex items-center justify-between">
            <div>
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300 block">
                MASTER OWNER ACCOUNT
              </span>
              <p className="font-brand text-lg font-extrabold text-white uppercase mt-1">
                {session?.fullName}
              </p>
              <p className="text-xs text-[#8E92A4] mt-0.5">{session?.email}</p>
            </div>
            <Crown className="w-7 h-7 text-amber-400 shrink-0" />
          </div>

          <div className="p-6 bg-[#0A0B0F] border border-white/[0.12] flex items-center justify-between">
            <div>
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-[#8E92A4] block">
                ACTIVE SALES ADMINISTRATORS
              </span>
              <p className="font-brand text-2xl font-extrabold text-white mt-1">
                {salesAdminsCount}{' '}
                <span className="text-xs font-display text-[#8E92A4]">
                  ADMINS
                </span>
              </p>
              <p className="text-xs text-[#8E92A4] mt-0.5">
                Authorized for Sales &amp; Order Dispatch
              </p>
            </div>
            <Users className="w-7 h-7 text-white shrink-0" />
          </div>

          <div className="p-6 bg-[#0A0B0F] border border-white/[0.12] flex items-center justify-between">
            <div>
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-[#8E92A4] block">
                SEPARATE ACCESS ARCHITECTURE
              </span>
              <p className="font-brand text-sm font-bold text-emerald-300 uppercase mt-1">
                3 ISOLATED PORTALS ACTIVE
              </p>
              <p className="text-xs text-[#8E92A4] mt-0.5">
                Customer (/) • Owner (/owner) • Admin (/admin)
              </p>
            </div>
            <ShieldCheck className="w-7 h-7 text-emerald-400 shrink-0" />
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Grid: Provision New Sales Admin (Left) & Active Admins Roster (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left 5 Cols: Provision New Sales Admin */}
          <div className="lg:col-span-5 bg-[#0A0B0F] border border-white/[0.14] p-6 sm:p-8 space-y-6">
            <div className="border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2 text-amber-300 font-display text-[10px] font-bold uppercase tracking-[0.22em]">
                <UserPlus className="w-3.5 h-3.5" />
                <span>PROVISION SALES ADMIN</span>
              </div>
              <h2 className="font-brand text-lg font-bold uppercase tracking-wider text-white mt-1">
                CREATE ADMIN ACCOUNT
              </h2>
              <p className="text-xs text-[#8E92A4] mt-1">
                Create credentials for a Sales Administrator who will log in via
                the dedicated <code className="text-white">/admin</code> portal.
              </p>
            </div>

            <form onSubmit={handleCreateSalesAdmin} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-display text-[10px] font-bold uppercase tracking-[0.18em] text-[#9EA2B3] mb-1.5">
                    FIRST NAME
                  </label>
                  <div
                    className={`flex items-center bg-[#11131A] border transition ${
                      adminFieldErrors.firstName
                        ? 'border-red-500/60 bg-red-500/[0.04]'
                        : 'border-white/[0.12] focus-within:border-white'
                    }`}
                  >
                    <User
                      className={`w-3.5 h-3.5 ml-3 shrink-0 ${
                        adminFieldErrors.firstName ? 'text-red-400' : 'text-[#7D8091]'
                      }`}
                    />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) =>
                        updateAdminField('firstName', e.target.value, setFirstName)
                      }
                      onBlur={() => handleAdminBlur('firstName')}
                      placeholder="Ahmed"
                      className="w-full bg-transparent px-3 py-3 text-xs text-white outline-none"
                    />
                  </div>
                  {adminFieldErrors.firstName && (
                    <div
                      role="alert"
                      className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/[0.08] border border-red-500/25 text-red-300 text-[11px] font-medium leading-snug"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{adminFieldErrors.firstName}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block font-display text-[10px] font-bold uppercase tracking-[0.18em] text-[#9EA2B3] mb-1.5">
                    LAST NAME
                  </label>
                  <div
                    className={`flex items-center bg-[#11131A] border transition ${
                      adminFieldErrors.lastName
                        ? 'border-red-500/60 bg-red-500/[0.04]'
                        : 'border-white/[0.12] focus-within:border-white'
                    }`}
                  >
                    <User
                      className={`w-3.5 h-3.5 ml-3 shrink-0 ${
                        adminFieldErrors.lastName ? 'text-red-400' : 'text-[#7D8091]'
                      }`}
                    />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) =>
                        updateAdminField('lastName', e.target.value, setLastName)
                      }
                      onBlur={() => handleAdminBlur('lastName')}
                      placeholder="Khalifa"
                      className="w-full bg-transparent px-3 py-3 text-xs text-white outline-none"
                    />
                  </div>
                  {adminFieldErrors.lastName && (
                    <div
                      role="alert"
                      className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/[0.08] border border-red-500/25 text-red-300 text-[11px] font-medium leading-snug"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{adminFieldErrors.lastName}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-display text-[10px] font-bold uppercase tracking-[0.18em] text-[#9EA2B3] mb-1.5">
                  ADMIN EMAIL ADDRESS
                </label>
                <div
                  className={`flex items-center bg-[#11131A] border transition ${
                    adminFieldErrors.email
                      ? 'border-red-500/60 bg-red-500/[0.04]'
                      : 'border-white/[0.12] focus-within:border-white'
                  }`}
                >
                  <Mail
                    className={`w-3.5 h-3.5 ml-3 shrink-0 ${
                      adminFieldErrors.email ? 'text-red-400' : 'text-[#7D8091]'
                    }`}
                  />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) =>
                      updateAdminField('email', e.target.value, setAdminEmail)
                    }
                    onBlur={() => handleAdminBlur('email')}
                    placeholder="sales.admin@khalifawear.com"
                    className="w-full bg-transparent px-3 py-3 text-xs text-white outline-none"
                  />
                </div>
                {adminFieldErrors.email && (
                  <div
                    role="alert"
                    className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/[0.08] border border-red-500/25 text-red-300 text-[11px] font-medium leading-snug"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>{adminFieldErrors.email}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-display text-[10px] font-bold uppercase tracking-[0.18em] text-[#9EA2B3] mb-1.5">
                    PHONE NUMBER
                  </label>
                  <div
                    className={`flex items-center bg-[#11131A] border transition ${
                      adminFieldErrors.phoneNo
                        ? 'border-red-500/60 bg-red-500/[0.04]'
                        : 'border-white/[0.12] focus-within:border-white'
                    }`}
                  >
                    <Phone
                      className={`w-3.5 h-3.5 ml-3 shrink-0 ${
                        adminFieldErrors.phoneNo ? 'text-red-400' : 'text-[#7D8091]'
                      }`}
                    />
                    <input
                      type="tel"
                      value={phoneNo}
                      onChange={(e) =>
                        updateAdminField('phoneNo', e.target.value, setPhoneNo)
                      }
                      onBlur={() => handleAdminBlur('phoneNo')}
                      placeholder="01012345678"
                      className="w-full bg-transparent px-3 py-3 text-xs text-white outline-none"
                    />
                  </div>
                  {adminFieldErrors.phoneNo && (
                    <div
                      role="alert"
                      className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/[0.08] border border-red-500/25 text-red-300 text-[11px] font-medium leading-snug"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{adminFieldErrors.phoneNo}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block font-display text-[10px] font-bold uppercase tracking-[0.18em] text-[#9EA2B3] mb-1.5">
                    REGION / CITY
                  </label>
                  <div
                    className={`flex items-center bg-[#11131A] border transition ${
                      adminFieldErrors.city
                        ? 'border-red-500/60 bg-red-500/[0.04]'
                        : 'border-white/[0.12] focus-within:border-white'
                    }`}
                  >
                    <MapPin
                      className={`w-3.5 h-3.5 ml-3 shrink-0 ${
                        adminFieldErrors.city ? 'text-red-400' : 'text-[#7D8091]'
                      }`}
                    />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) =>
                        updateAdminField('city', e.target.value, setCity)
                      }
                      onBlur={() => handleAdminBlur('city')}
                      placeholder="Cairo"
                      className="w-full bg-transparent px-3 py-3 text-xs text-white outline-none"
                    />
                  </div>
                  {adminFieldErrors.city && (
                    <div
                      role="alert"
                      className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/[0.08] border border-red-500/25 text-red-300 text-[11px] font-medium leading-snug"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{adminFieldErrors.city}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-display text-[10px] font-bold uppercase tracking-[0.18em] text-[#9EA2B3] mb-1.5">
                  ASSIGN PASSWORD
                </label>
                <div
                  className={`flex items-center bg-[#11131A] border transition ${
                    adminFieldErrors.password
                      ? 'border-red-500/60 bg-red-500/[0.04]'
                      : 'border-white/[0.12] focus-within:border-white'
                  }`}
                >
                  <Lock
                    className={`w-3.5 h-3.5 ml-3 shrink-0 ${
                      adminFieldErrors.password ? 'text-red-400' : 'text-[#7D8091]'
                    }`}
                  />
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) =>
                      updateAdminField('password', e.target.value, setAdminPassword)
                    }
                    onBlur={() => handleAdminBlur('password')}
                    placeholder="Strong password (e.g. Sales@2026)"
                    className="w-full bg-transparent px-3 py-3 text-xs text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword((v) => !v)}
                    className="px-3 text-[#7D8091] hover:text-white cursor-pointer"
                  >
                    {showAdminPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                {adminFieldErrors.password && (
                  <div
                    role="alert"
                    className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/[0.08] border border-red-500/25 text-red-300 text-[11px] font-medium leading-snug"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>{adminFieldErrors.password}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {passwordChecks.map((chk) => (
                    <span
                      key={chk.label}
                      className={`px-2 py-0.5 text-[10px] font-display uppercase tracking-wider border ${
                        chk.valid
                          ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                          : 'bg-white/[0.03] border-white/10 text-[#6D7080]'
                      }`}
                    >
                      {chk.label}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingAdmin}
                className="w-full py-4 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-[#060608] font-display text-xs font-extrabold uppercase tracking-[0.22em] flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {submittingAdmin ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>PROVISIONING ADMIN...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>CREATE SALES ADMIN ACCOUNT</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right 7 Cols: Active Administrators Roster */}
          <div className="lg:col-span-7 bg-[#0A0B0F] border border-white/[0.14] p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <div className="flex items-center gap-2 text-[#9EA2B3] font-display text-[10px] font-bold uppercase tracking-[0.22em]">
                  <Users className="w-3.5 h-3.5 text-white" />
                  <span>AUTHORIZED STORE PERSONNEL</span>
                </div>
                <h2 className="font-brand text-lg font-bold uppercase tracking-wider text-white mt-1">
                  ADMINISTRATOR DIRECTORY ({admins.length})
                </h2>
              </div>
            </div>

            {loadingAdmins ? (
              <div className="py-16 flex items-center justify-center gap-2.5 text-xs text-[#8E92A4]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>LOADING ADMINISTRATORS...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {admins.map((adm) => {
                  const isOwnerRow =
                    adm.role === 'Owner' ||
                    adm.email.toLowerCase() === session?.email.toLowerCase();

                  return (
                    <div
                      key={adm.id}
                      className="p-4 sm:p-5 bg-[#11131A] border border-white/[0.1] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-brand text-sm font-bold uppercase tracking-wide text-white">
                            {adm.fullName}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 text-[9px] font-display font-bold uppercase tracking-[0.2em] border ${
                              isOwnerRow
                                ? 'bg-amber-500/15 text-amber-300 border-amber-400/35'
                                : 'bg-white/10 text-white border-white/20'
                            }`}
                          >
                            {isOwnerRow ? 'STORE OWNER' : 'SALES ADMIN'}
                          </span>
                        </div>
                        <p className="text-xs text-[#9EA2B3]">{adm.email}</p>
                        {adm.phoneNumber && (
                          <p className="text-[11px] text-[#6E7285]">
                            Phone: {adm.phoneNumber}
                          </p>
                        )}
                      </div>

                      {!isOwnerRow && (
                        <button
                          type="button"
                          disabled={deletingAdminId === adm.id}
                          onClick={() => handleDeleteAdmin(adm)}
                          className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-200 font-display text-[10px] font-bold uppercase tracking-[0.18em] flex items-center gap-1.5 transition cursor-pointer self-start sm:self-center"
                        >
                          {deletingAdminId === adm.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>REVOKE ACCESS</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
