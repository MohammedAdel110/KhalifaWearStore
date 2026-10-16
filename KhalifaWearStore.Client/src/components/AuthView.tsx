import React, { useState, useMemo, useEffect } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  MapPin,
  ArrowRight,
  Flame,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  LogOut,
  UserPlus,
  Crown,
} from 'lucide-react';
import {
  loginUser,
  registerCustomer,
  createAdminUser,
  type AuthResponseDto,
} from '../services/authApi';

type AuthMode = 'login' | 'register';

interface AuthViewProps {
  session: AuthResponseDto | null;
  onSessionChange: (session: AuthResponseDto | null) => void;
  onGoToShop: () => void;
}

const STREETWEAR_SLIDES = [
  {
    drop: 'HEAVYWEIGHT HOODIE DROP // 01',
    title: '500 GSM OVERSIZED HOODIES BUILT FOR THE STREETS.',
    subtitle:
      'Engineered with ultra-dense 100% combed Egyptian cotton fleece, drop-shoulder boxy cuts, and double-lined structured hoods.',
    image:
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1400&q=85',
    stats: [
      { label: 'FABRIC WEIGHT', value: '500 GSM FLEECE' },
      { label: 'SILHOUETTE', value: 'BOX / DROP-SHOULDER' },
      { label: 'DIVISION', value: "MEN'S STREETWEAR" },
    ],
  },
  {
    drop: 'WINTER ARCHIVE // 02',
    title: 'MONOCHROME PRECISION. UNCOMPROMISING STREETWEAR.',
    subtitle:
      'From heavyweight pullover hoodies to technical zip-ups and relaxed cargos—crafted for men who command the urban landscape.',
    image:
      'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=1400&q=85',
    stats: [
      { label: 'STITCHING', value: 'REINFORCED TWIN' },
      { label: 'WASH', value: 'CARBON GARMENT DYE' },
      { label: 'RELEASE', value: 'LIMITED RUN' },
    ],
  },
  {
    drop: 'CORE ESSENTIALS // 03',
    title: 'SIGNATURE KF HOODIES & URBAN ATHLETIC ARMOR.',
    subtitle:
      'Members unlock early access to limited hoodie colorways, restock alerts, and instant express dispatch across Egypt.',
    image:
      'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=1400&q=85',
    stats: [
      { label: 'COTTON', value: '100% ORGANIC' },
      { label: 'FIT', value: 'OVERSIZED MEN' },
      { label: 'SERIES', value: 'KF-2026' },
    ],
  },
];

export const AuthView: React.FC<AuthViewProps> = ({
  session,
  onSessionChange,
  onGoToShop,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [activeSlide, setActiveSlide] = useState(0);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state (Customer registration — no role or postcode exposed)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [city, setCity] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Admin Creation form state (Only accessible when logged in as Admin)
  const [showAdminCreator, setShowAdminCreator] = useState(false);
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminCity, setAdminCity] = useState('Cairo');
  const [adminPassword, setAdminPassword] = useState('');
  const [createdAdminResult, setCreatedAdminResult] = useState<AuthResponseDto | null>(null);

  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % STREETWEAR_SLIDES.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  const passwordChecks = useMemo(() => {
    const pwd = showAdminCreator ? adminPassword : regPassword;
    return [
      { label: '6+ chars', valid: pwd.length >= 6 },
      { label: 'Uppercase (A-Z)', valid: /[A-Z]/.test(pwd) },
      { label: 'Lowercase (a-z)', valid: /[a-z]/.test(pwd) },
      { label: 'Number (0-9)', valid: /[0-9]/.test(pwd) },
      { label: 'Symbol (@$!%*?&)', valid: /[^A-Za-z0-9]/.test(pwd) },
    ];
  }, [regPassword, adminPassword, showAdminCreator]);

  const passwordStrengthScore = useMemo(
    () => passwordChecks.filter((c) => c.valid).length,
    [passwordChecks]
  );

  const handleSwitchMode = (target: AuthMode) => {
    setMode(target);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const data = await loginUser({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      onSessionChange(data);
      if (rememberMe) {
        localStorage.setItem('kf_auth_session', JSON.stringify(data));
      }
      setSuccessMessage(`Welcome back to Khalifa Wear House, ${data.fullName}.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (passwordStrengthScore < 5) {
      setErrorMessage(
        'Please ensure your password meets all 5 security criteria highlighted below.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const data = await registerCustomer({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: regEmail.trim(),
        phoneNo: phoneNo.trim(),
        city: city.trim(),
        password: regPassword,
      });
      onSessionChange(data);
      localStorage.setItem('kf_auth_session', JSON.stringify(data));
      setSuccessMessage(`Welcome to Khalifa Wear House, ${data.fullName}.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to complete registration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setCreatedAdminResult(null);

    if (passwordStrengthScore < 5) {
      setErrorMessage('New admin password must satisfy all 5 security requirements.');
      return;
    }

    setIsLoading(true);
    try {
      const newAdmin = await createAdminUser(
        {
          firstName: adminFirstName.trim(),
          lastName: adminLastName.trim(),
          email: adminEmail.trim(),
          phoneNo: adminPhone.trim(),
          city: adminCity.trim(),
          password: adminPassword,
        },
        session.token
      );
      setCreatedAdminResult(newAdmin);
      setSuccessMessage(`Administrator "${newAdmin.fullName}" (${newAdmin.email}) created.`);
      setAdminFirstName('');
      setAdminLastName('');
      setAdminEmail('');
      setAdminPhone('');
      setAdminPassword('');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create administrator');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    onSessionChange(null);
    setShowAdminCreator(false);
    setCreatedAdminResult(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    localStorage.removeItem('kf_auth_session');
  };

  const currentSlide = STREETWEAR_SLIDES[activeSlide];

  return (
    <div className="min-h-[calc(100vh-5rem)] w-full bg-[#060608] text-[#F4F4F6] flex flex-col lg:flex-row relative overflow-hidden">
      {/* LEFT PANEL: MEN'S HEAVYWEIGHT HOODIES & STREETWEAR SHOWCASE */}
      <aside className="relative lg:w-[52%] xl:w-[55%] min-h-[420px] flex flex-col justify-between p-8 sm:p-12 xl:p-16 border-b lg:border-b-0 lg:border-r border-white/[0.08] overflow-hidden select-none">
        <div className="absolute inset-0 z-0">
          {STREETWEAR_SLIDES.map((slide, idx) => (
            <img
              key={slide.drop}
              src={slide.image}
              alt={slide.title}
              className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-1000 ease-out ${
                idx === activeSlide
                  ? 'opacity-45 scale-105 filter grayscale-[30%] contrast-125'
                  : 'opacity-0 scale-100'
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-[#060608]/75 to-[#060608]/50" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060608]/90 via-[#060608]/40 to-[#060608]/95" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
            }}
          />
        </div>

        {/* Center Hero Copy */}
        <div className="relative z-10 my-auto py-8 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/[0.07] border border-white/[0.16] text-white text-[11px] font-display font-bold tracking-[0.22em] uppercase mb-6">
            <Flame className="w-3.5 h-3.5 text-white" />
            <span>{currentSlide.drop}</span>
          </div>

          <h1 className="font-brand text-3xl sm:text-4xl xl:text-5xl font-extrabold leading-[1.12] tracking-wide text-white uppercase mb-5 drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
            {currentSlide.title}
          </h1>

          <p className="text-sm sm:text-base text-[#B4B6C2] leading-relaxed font-normal max-w-lg mb-8">
            {currentSlide.subtitle}
          </p>

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/[0.12]">
            {currentSlide.stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-[10px] font-display uppercase tracking-[0.22em] text-[#7D8091] mb-1">
                  {stat.label}
                </p>
                <p className="font-brand text-xs sm:text-sm font-bold tracking-wider text-white">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            {STREETWEAR_SLIDES.map((s, idx) => (
              <button
                key={s.drop}
                type="button"
                onClick={() => setActiveSlide(idx)}
                aria-label={`View drop slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                  idx === activeSlide
                    ? 'w-12 bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]'
                    : 'w-3 bg-white/25 hover:bg-white/50'
                }`}
              />
            ))}
          </div>

          <p className="font-brand text-[10px] tracking-[0.26em] uppercase text-[#8A8D9F]">
            KF // KHALIFA WEAR HOUSE © {new Date().getFullYear()}
          </p>
        </div>
      </aside>

      {/* RIGHT PANEL: AUTHENTICATION & MEMBER ACCESS STUDIO */}
      <main className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-14 xl:p-16 relative z-10">
        <div className="w-full max-w-[480px]">
          <div className="flex flex-col items-start mb-6">
            <img
              src="/logo.png"
              alt="Khalifa Wear House"
              className="h-8 sm:h-9 w-auto object-contain mb-4 brightness-125"
            />
            <div className="w-full flex items-end justify-between">
              <div>
                <span className="font-display text-[11px] uppercase tracking-[0.26em] text-[#9EA2B3] font-semibold block">
                  {session
                    ? session.role === 'Admin'
                      ? 'ADMINISTRATION HQ'
                      : 'MEMBER VAULT'
                    : mode === 'login'
                    ? 'MEMBER ACCESS'
                    : 'NEW DROP MEMBERSHIP'}
                </span>
                <h2 className="font-brand text-xl sm:text-2xl font-extrabold tracking-wider uppercase text-white mt-1">
                  {session
                    ? `WELCOME, ${session.fullName.split(' ')[0]}`
                    : mode === 'login'
                    ? 'SIGN IN TO KHALIFA'
                    : 'JOIN THE WEAR HOUSE'}
                </h2>
              </div>
            </div>
          </div>

          {session ? (
            <div className="glass-panel rounded-3xl border border-white/[0.12] p-6 sm:p-8 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9)] space-y-6">
              {/* Digital Streetwear Member Card */}
              <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-[#1C1D24] via-[#121318] to-[#090A0D] border border-white/[0.18] shadow-inner">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-display font-bold uppercase tracking-[0.2em] bg-white/10 text-white border border-white/25">
                      {session.role === 'Admin' ? (
                        <>
                          <Crown className="w-3 h-3" />
                          <span>STORE ADMIN</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3 h-3" />
                          <span>VERIFIED MEMBER</span>
                        </>
                      )}
                    </span>
                    <h3 className="font-brand text-lg font-bold text-white uppercase tracking-wider mt-2.5">
                      {session.fullName}
                    </h3>
                    <p className="text-xs text-[#9EA2B3] mt-0.5">{session.email}</p>
                    {session.phoneNumber && (
                      <p className="text-xs text-[#7D8091] mt-0.5">{session.phoneNumber}</p>
                    )}
                  </div>

                  <img
                    src="/logo.png"
                    alt="KF"
                    className="h-7 w-auto object-contain brightness-125"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-200 text-xs leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-200 text-xs leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {session.role === 'Admin' && (
                <div className="pt-2 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminCreator(!showAdminCreator);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.2] text-white text-xs font-display font-bold uppercase tracking-[0.16em] transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-white" />
                      {showAdminCreator
                        ? 'Hide Admin Provisioning'
                        : 'Add New Store Administrator'}
                    </span>
                    <ArrowRight
                      className={`w-4 h-4 transition-transform ${
                        showAdminCreator ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  {showAdminCreator && (
                    <form
                      onSubmit={handleCreateAdminSubmit}
                      className="mt-4 p-4 rounded-2xl bg-black/50 border border-white/[0.1] space-y-3.5"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-display uppercase tracking-[0.18em] text-[#9EA2B3] mb-1">
                            First Name
                          </label>
                          <input
                            type="text"
                            required
                            value={adminFirstName}
                            onChange={(e) => setAdminFirstName(e.target.value)}
                            placeholder="Tariq"
                            className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-display uppercase tracking-[0.18em] text-[#9EA2B3] mb-1">
                            Last Name
                          </label>
                          <input
                            type="text"
                            required
                            value={adminLastName}
                            onChange={(e) => setAdminLastName(e.target.value)}
                            placeholder="Khalifa"
                            className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-display uppercase tracking-[0.18em] text-[#9EA2B3] mb-1">
                            Admin Email
                          </label>
                          <input
                            type="email"
                            required
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            placeholder="admin2@khalifawear.com"
                            className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-display uppercase tracking-[0.18em] text-[#9EA2B3] mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            required
                            value={adminPhone}
                            onChange={(e) => setAdminPhone(e.target.value)}
                            placeholder="01012345678"
                            className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-display uppercase tracking-[0.18em] text-[#9EA2B3] mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          required
                          value={adminCity}
                          onChange={(e) => setAdminCity(e.target.value)}
                          placeholder="Cairo"
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-display uppercase tracking-[0.18em] text-[#9EA2B3] mb-1">
                          Temporary Password
                        </label>
                        <input
                          type="password"
                          required
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="e.g. Khalifa@2026"
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-white"
                        />
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {passwordChecks.map((check) => (
                          <span
                            key={check.label}
                            className={`px-2 py-0.5 rounded-md text-[10px] border transition ${
                              check.valid
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                : 'bg-white/[0.02] border-white/[0.08] text-[#7D8091]'
                            }`}
                          >
                            {check.label}
                          </span>
                        ))}
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2.5 rounded-xl bg-white hover:bg-[#E2E4E9] text-[#060608] font-brand font-bold text-xs uppercase tracking-[0.18em] transition cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? 'PROVISIONING...' : 'AUTHORIZE & CREATE ADMIN'}
                      </button>

                      {createdAdminResult && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-200">
                          New Admin Ready: <strong>{createdAdminResult.email}</strong>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onGoToShop}
                  className="py-3.5 rounded-xl bg-white hover:bg-[#E2E4E9] text-[#060608] font-brand text-xs font-extrabold uppercase tracking-[0.18em] transition cursor-pointer"
                >
                  BROWSE HOODIES
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/[0.04] hover:bg-red-500/15 border border-white/[0.09] hover:border-red-500/30 text-xs font-display font-bold uppercase tracking-[0.2em] text-[#C8C8D0] hover:text-red-200 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>SIGN OUT</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl border border-white/[0.12] p-6 sm:p-8 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9)]">
              <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-[#090A0D] border border-white/[0.08] mb-7">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('login')}
                  className={`py-2.5 rounded-xl font-brand text-xs font-bold uppercase tracking-[0.18em] transition-all duration-300 cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-[#060608] shadow-[0_4px_20px_rgba(255,255,255,0.2)]'
                      : 'text-[#7D8091] hover:text-white'
                  }`}
                >
                  SIGN IN
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('register')}
                  className={`py-2.5 rounded-xl font-brand text-xs font-bold uppercase tracking-[0.18em] transition-all duration-300 cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white text-[#060608] shadow-[0_4px_20px_rgba(255,255,255,0.2)]'
                      : 'text-[#7D8091] hover:text-white'
                  }`}
                >
                  REGISTER
                </button>
              </div>

              {errorMessage && (
                <div className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-200 text-xs leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-200 text-xs leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {mode === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  <div>
                    <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B4B6C2] mb-2">
                      Email Address
                    </label>
                    <div className="relative flex items-center rounded-xl bg-white/[0.03] border border-white/[0.1] transition-all silver-border-glow">
                      <Mail className="w-4 h-4 text-[#7D8091] ml-4 shrink-0" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="member@khalifawear.com"
                        className="w-full bg-transparent px-3.5 py-3.5 text-sm text-white placeholder-[#555869] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B4B6C2]">
                        Password
                      </label>
                      <span className="text-[11px] text-[#9EA2B3] hover:text-white cursor-pointer transition">
                        Forgot password?
                      </span>
                    </div>
                    <div className="relative flex items-center rounded-xl bg-white/[0.03] border border-white/[0.1] transition-all silver-border-glow">
                      <Lock className="w-4 h-4 text-[#7D8091] ml-4 shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-transparent px-3.5 py-3.5 text-sm text-white placeholder-[#555869] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-3.5 text-[#7D8091] hover:text-white transition cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#9EA2B3]">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-white/20 bg-white/5 text-white focus:ring-0"
                      />
                      <span>Keep me signed in for future drops</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full py-4 rounded-xl bg-gradient-to-r from-white via-[#E5E7EB] to-[#CBD5E1] text-[#060608] font-brand font-extrabold text-xs uppercase tracking-[0.22em] shadow-[0_10px_30px_-5px_rgba(255,255,255,0.22)] hover:shadow-[0_15px_35px_-5px_rgba(255,255,255,0.38)] transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isLoading ? 'AUTHENTICATING...' : 'SIGN IN TO KHALIFA'}</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B4B6C2] mb-1.5">
                        First Name
                      </label>
                      <div className="relative flex items-center rounded-xl bg-white/[0.03] border border-white/[0.1] transition-all silver-border-glow">
                        <User className="w-4 h-4 text-[#7D8091] ml-3.5 shrink-0" />
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Ziad"
                          className="w-full bg-transparent px-3 py-3 text-xs sm:text-sm text-white placeholder-[#555869] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B4B6C2] mb-1.5">
                        Last Name
                      </label>
                      <div className="relative flex items-center rounded-xl bg-white/[0.03] border border-white/[0.1] transition-all silver-border-glow">
                        <User className="w-4 h-4 text-[#7D8091] ml-3.5 shrink-0" />
                        <input
                          type="text"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Khalifa"
                          className="w-full bg-transparent px-3 py-3 text-xs sm:text-sm text-white placeholder-[#555869] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B4B6C2] mb-1.5">
                        Email Address
                      </label>
                      <div className="relative flex items-center rounded-xl bg-white/[0.03] border border-white/[0.1] transition-all silver-border-glow">
                        <Mail className="w-4 h-4 text-[#7D8091] ml-3.5 shrink-0" />
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="ziad@gmail.com"
                          className="w-full bg-transparent px-3 py-3 text-xs sm:text-sm text-white placeholder-[#555869] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B4B6C2] mb-1.5">
                        Phone Number
                      </label>
                      <div className="relative flex items-center rounded-xl bg-white/[0.03] border border-white/[0.1] transition-all silver-border-glow">
                        <Phone className="w-4 h-4 text-[#7D8091] ml-3.5 shrink-0" />
                        <input
                          type="tel"
                          required
                          value={phoneNo}
                          onChange={(e) => setPhoneNo(e.target.value)}
                          placeholder="01005483660"
                          className="w-full bg-transparent px-3 py-3 text-xs sm:text-sm text-white placeholder-[#555869] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B4B6C2] mb-1.5">
                      City / Governorate
                    </label>
                    <div className="relative flex items-center rounded-xl bg-white/[0.03] border border-white/[0.1] transition-all silver-border-glow">
                      <MapPin className="w-4 h-4 text-[#7D8091] ml-3.5 shrink-0" />
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Cairo"
                        className="w-full bg-transparent px-3 py-3 text-xs sm:text-sm text-white placeholder-[#555869] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B4B6C2] mb-1.5">
                      Password
                    </label>
                    <div className="relative flex items-center rounded-xl bg-white/[0.03] border border-white/[0.1] transition-all silver-border-glow">
                      <Lock className="w-4 h-4 text-[#7D8091] ml-3.5 shrink-0" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min. 6 chars with A-Z, a-z, 0-9 & symbol"
                        className="w-full bg-transparent px-3 py-3 text-xs sm:text-sm text-white placeholder-[#555869] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="p-3 text-[#7D8091] hover:text-white transition cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showRegPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="mt-2.5 space-y-2">
                      <div className="flex gap-1.5 h-1">
                        {[1, 2, 3, 4, 5].map((step) => (
                          <div
                            key={step}
                            className={`flex-1 rounded-full transition-all duration-300 ${
                              passwordStrengthScore >= step
                                ? passwordStrengthScore === 5
                                  ? 'bg-emerald-400'
                                  : 'bg-white'
                                : 'bg-white/[0.08]'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {passwordChecks.map((item) => (
                          <span
                            key={item.label}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border transition ${
                              item.valid
                                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                                : 'bg-white/[0.02] border-white/[0.07] text-[#7D8091]'
                            }`}
                          >
                            <span
                              className={`w-1 h-1 rounded-full ${
                                item.valid ? 'bg-emerald-400' : 'bg-[#555869]'
                              }`}
                            />
                            {item.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-white via-[#E5E7EB] to-[#CBD5E1] text-[#060608] font-brand font-extrabold text-xs uppercase tracking-[0.22em] shadow-[0_10px_30px_-5px_rgba(255,255,255,0.22)] hover:shadow-[0_15px_35px_-5px_rgba(255,255,255,0.38)] transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>
                      {isLoading ? 'CREATING ACCOUNT...' : 'CREATE MEMBER ACCOUNT'}
                    </span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
