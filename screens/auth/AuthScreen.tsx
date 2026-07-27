import { useEffect, useRef, useState, FormEvent } from 'react';
import Image from 'next/image';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldAlert,
  XCircle,
  KeyRound,
  MailCheck,
  CheckCircle2,
  Heart
} from 'lucide-react';

import { btn, inp } from '../../lib/constants';
import { PanelPublicSettings } from '../../lib/types';
import { Panel, Shell, cn } from '../../components/ui';
import { AuthField as Field, PasswordToggle, authFieldVariants } from '../../components/auth/AuthControls';
import { ThemeSwitcher } from '../../components/theme/ThemeSwitcher';
import { DitheringBackdrop } from '../../components/visual/DitheringBackdrop';

interface AuthScreenProps {
  busy: boolean;
  message: string;
  settings: PanelPublicSettings;
  twoFactorRequired?: boolean;
  resetToken?: string;
  onSubmit: (mode: 'login' | 'register', form: any) => Promise<{ requiresTwoFactor?: boolean } | void>;
  onTwoFactor: (code: string) => Promise<void>;
  onRequestPasswordReset: (email: string) => Promise<void>;
  onResetPassword: (token: string, password: string) => Promise<void>;
}

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, any>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

const rightPanelStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08
    }
  }
};

const rightPanelItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 }
};

export function AuthScreen({ busy, message, settings, twoFactorRequired = false, resetToken = '', onSubmit, onTwoFactor, onRequestPasswordReset, onResetPassword }: AuthScreenProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(resetToken ? 'reset' : 'login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', confirmPassword: '', inviteKey: '' });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [apiError, setApiError] = useState('');
  const [awaitingTwoFactor, setAwaitingTwoFactor] = useState(twoFactorRequired);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const [passwordResetComplete, setPasswordResetComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [shaderColors, setShaderColors] = useState({ back: '#08090a', front: '#ffffff' });
  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef('');

  const captchaRequired =
    settings.captcha.enabled && (
      (authMode === 'login' && settings.captcha.requireOnLogin)
      || (authMode === 'register' && settings.captcha.requireOnRegister)
    );

  const passwordsMismatch =
    authMode === 'reset' && authForm.confirmPassword.length > 0 && authForm.password !== authForm.confirmPassword;

  useEffect(() => {
    const updateColors = () => {
      const rootStyle = getComputedStyle(document.documentElement);
      setShaderColors({
        back: rootStyle.getPropertyValue('--background').trim() || '#08090a',
        front: rootStyle.getPropertyValue('--primary').trim() || '#ffffff',
      });
    };
    updateColors();
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!settings.registration.enabled && authMode === 'register') {
      setAuthMode('login');
    }
  }, [authMode, settings.registration.enabled]);

  useEffect(() => {
    setApiError('');
  }, [authMode]);

  useEffect(() => {
    if (authMode !== 'forgot') setResetLinkSent(false);
    if (authMode !== 'reset') setPasswordResetComplete(false);
  }, [authMode]);

  useEffect(() => {
    setTurnstileToken('');

    if (widgetRef.current && window.turnstile) {
      window.turnstile.remove(widgetRef.current);
      widgetRef.current = '';
    }

    if (!captchaRequired || !turnstileRef.current || !settings.captcha.siteKey) return;

    const render = () => {
      if (!window.turnstile || !turnstileRef.current || widgetRef.current) return;

      widgetRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: settings.captcha.siteKey,
        theme: 'dark',
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken('')
      });
    };

    if (!document.querySelector('script[data-turnstile-script]')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = 'true';
      script.onload = render;
      document.head.appendChild(script);
    } else {
      render();
    }

    return () => {
      if (widgetRef.current && window.turnstile) {
        window.turnstile.remove(widgetRef.current);
        widgetRef.current = '';
      }
    };
  }, [authMode, captchaRequired, settings.captcha.siteKey]);

  function resetCaptcha() {
    setTurnstileToken('');
    if (widgetRef.current && window.turnstile) {
      window.turnstile.reset(widgetRef.current);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError('');
    try {
      if (authMode === 'forgot') {
        await onRequestPasswordReset(authForm.email);
        setResetLinkSent(true);
        return;
      }
      if (authMode === 'reset') {
        if (authForm.password !== authForm.confirmPassword) throw new Error('Passwords do not match.');
        await onResetPassword(resetToken, authForm.password);
        setAuthForm({ ...authForm, password: '', confirmPassword: '' });
        setPasswordResetComplete(true);
        return;
      }
      const result = await onSubmit(authMode, { ...authForm, turnstileToken });
      if (result && result.requiresTwoFactor) setAwaitingTwoFactor(true);
    } catch (err: any) {
      setApiError(err?.message || 'An unexpected error occurred. Please try again.');
      if (captchaRequired) resetCaptcha();
    }
  }

  async function handleTwoFactorSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError('');
    try {
      await onTwoFactor(twoFactorCode);
    } catch (err: any) {
      setApiError(err?.message || 'The authentication code was rejected.');
      setTwoFactorCode('');
    }
  }

  function backToSignIn() {
    setApiError('');
    setAwaitingTwoFactor(false);
    setTwoFactorCode('');
    setResetLinkSent(false);
    setPasswordResetComplete(false);
    setAuthForm({ ...authForm, password: '', confirmPassword: '' });
    setAuthMode('login');
  }

  const displayMessage = apiError || message;
  const socialProviders = [
    { key: 'google', label: 'Google', enabled: settings.socialAuth?.google?.enabled === true, iconUrl: 'https://thesvg.org/icons/google/default.svg' },
    { key: 'discord', label: 'Discord', enabled: settings.socialAuth?.discord?.enabled === true, iconUrl: 'https://thesvg.org/icons/discord/default.svg' }
  ].filter(provider => provider.enabled);

  return (
    <Shell>
      <MotionConfig
        transition={{
          duration: 0.22,
          ease: [0.22, 1, 0.36, 1]
        }}
      >
        <div className="relative grid min-h-[100dvh] w-full grid-cols-1 overflow-x-hidden bg-[var(--background)] lg:grid-cols-12">
          <div className="mobile-safe-top absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:justify-end">
            <span className="truncate pr-4 text-xs font-bold uppercase tracking-[0.18em] text-[var(--foreground)] lg:hidden">
              {settings.branding.name}
            </span>
            <ThemeSwitcher responsiveLabels />
          </div>

          {/* Left Side: Auth Forms Panel */}
          <main className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-start overflow-hidden border-[var(--border)]/30 bg-[var(--background)] px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-36 sm:px-8 sm:pt-40 lg:col-span-5 lg:justify-center lg:border-r lg:py-20 xl:col-span-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,var(--secondary),transparent_34%)] opacity-60 lg:hidden" />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative w-full max-w-[390px]"
            >
              <Panel className="flex flex-col gap-5 border-0 bg-transparent p-0 shadow-none backdrop-blur-none sm:gap-6">
                
                {/* Header (Responsive variant for smaller screens) */}
                <div className="flex flex-col">
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-2 hidden text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]"
                  >
                    {settings.branding.name}
                  </motion.p>

                  <AnimatePresence mode="wait">
                    <motion.h1
                      key={awaitingTwoFactor ? 'two-factor' : resetLinkSent ? 'reset-sent' : passwordResetComplete ? 'reset-done' : authMode}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="text-[clamp(1.75rem,7vw,2.25rem)] font-light tracking-tight text-[var(--foreground)]"
                    >
                      {awaitingTwoFactor
                        ? <>Two-factor<span className="text-[var(--primary)]">.</span></>
                        : passwordResetComplete
                          ? <>Password changed<span className="text-[var(--primary)]">.</span></>
                          : resetLinkSent
                            ? <>Check your inbox<span className="text-[var(--primary)]">.</span></>
                            : authMode === 'forgot'
                              ? <>Reset password<span className="text-[var(--primary)]">.</span></>
                              : authMode === 'reset'
                                ? <>Choose password<span className="text-[var(--primary)]">.</span></>
                                : authMode === 'login'
                                  ? <>Welcome back<span className="text-[var(--primary)]">.</span></>
                                  : <>Create account<span className="text-[var(--primary)]">.</span></>
                      }
                    </motion.h1>
                  </AnimatePresence>

                  <p className="mt-2 text-sm font-medium text-[var(--muted-foreground)]/80 leading-relaxed">
                    {awaitingTwoFactor
                      ? 'Enter an authenticator code or one of your recovery codes.'
                      : passwordResetComplete
                        ? 'Your password has been updated. Sign in with your new password.'
                        : resetLinkSent
                          ? `If an account exists for ${authForm.email || 'that address'}, a reset link is on its way.`
                          : authMode === 'forgot'
                            ? 'We will send a secure reset link to your account email.'
                            : authMode === 'reset'
                              ? 'Enter a new password for your account.'
                            : ''}
                  </p>
                </div>

                {/* Login / Register tab switcher */}
                {!awaitingTwoFactor && (authMode === 'login' || authMode === 'register') && (
                  <div className="relative grid grid-cols-2 rounded-xl border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-1">
                    {authMode === 'login' && (
                      <motion.div
                        layoutId="auth-active-tab"
                        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/50 shadow-sm"
                      />
                    )}
                    {authMode === 'register' && (
                      <motion.div
                        layoutId="auth-active-tab"
                        className="absolute inset-y-1 left-[50%] w-[calc(50%-0.25rem)] rounded-lg border border-[var(--border)]/60 bg-[var(--secondary)]/50 shadow-sm"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className={cn(
                        'relative z-10 rounded-lg py-2 text-sm font-semibold transition-colors',
                        authMode === 'login'
                          ? 'text-[var(--foreground)]'
                          : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                      )}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      disabled={!settings.registration.enabled}
                      onClick={() => setAuthMode('register')}
                      title={!settings.registration.enabled ? 'Registration is currently disabled' : undefined}
                      className={cn(
                        'relative z-10 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors',
                        authMode === 'register'
                          ? 'text-[var(--foreground)]'
                          : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                        !settings.registration.enabled && 'cursor-not-allowed opacity-50 hover:text-[var(--muted-foreground)]'
                      )}
                    >
                      {!settings.registration.enabled && <ShieldAlert size={14} />}
                      Register
                    </button>
                  </div>
                )}

                {/* Forgot-password Flow Confirmation */}
                {authMode === 'forgot' && resetLinkSent && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-4 py-2 text-center"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                      <MailCheck size={26} />
                    </div>
                    <p className="text-sm font-medium text-[var(--muted-foreground)]">
                      Didn't get anything? Check your spam folder, or try again with a different address.
                    </p>
                    <div className="flex w-full flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        className={cn(
                          btn,
                            'min-h-11 flex-1 rounded-xl border border-[var(--border)]/60 bg-[var(--secondary)]/10 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--secondary)]/30'
                        )}
                        onClick={() => setResetLinkSent(false)}
                      >
                        Try another email
                      </button>
                      <button
                        type="button"
                        className={cn(
                          btn,
                            'min-h-11 flex-1 rounded-xl bg-[var(--foreground)] text-sm font-semibold text-[var(--background)] hover:bg-[var(--foreground)]/90'
                        )}
                        onClick={backToSignIn}
                      >
                        Back to sign in
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Password reset Flow Confirmation */}
                {authMode === 'reset' && passwordResetComplete && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-4 py-2 text-center"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                      <CheckCircle2 size={26} />
                    </div>
                    <button
                      type="button"
                      className={cn(
                        btn,
                        'group relative h-11 w-full gap-2 rounded-xl text-sm font-bold',
                        'bg-[var(--foreground)] text-[var(--background)]',
                        'hover:bg-[var(--foreground)]/90 hover:shadow-lg'
                      )}
                      onClick={backToSignIn}
                    >
                      Continue to sign in
                      <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </motion.div>
                )}

                {/* Primary Form Elements */}
                {!awaitingTwoFactor && !resetLinkSent && !passwordResetComplete && (
                  <form onSubmit={handleSubmit}>
                    <motion.div
                      key={authMode}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      variants={{
                        hidden: {},
                        show: { transition: { staggerChildren: 0.055 } }
                      }}
                      className="grid gap-4"
                    >
                      <AnimatePresence mode="popLayout">
                        {authMode === 'register' && (
                          <Field
                            key="name"
                            icon={User}
                            placeholder="Full Name"
                            autoComplete="name"
                            autoFocus
                            value={authForm.name}
                            onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                            required
                          />
                        )}
                      </AnimatePresence>

                      {authMode !== 'reset' && <Field
                        icon={Mail}
                        type="email"
                        placeholder="Email Address"
                        autoComplete="email"
                        autoFocus={authMode === 'login' || authMode === 'forgot'}
                        value={authForm.email}
                        onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                        required
                      />}

                      {authMode !== 'forgot' && <Field
                        icon={Lock}
                        type={showPassword ? 'text' : 'password'}
                        placeholder={authMode === 'reset' ? 'New Password' : 'Password'}
                        autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                        autoFocus={authMode === 'reset'}
                        value={authForm.password}
                        onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                        minLength={settings.passwordPolicy.minLength}
                        maxLength={settings.passwordPolicy.maxLength}
                        required
                        hint={authMode === 'register' || authMode === 'reset' ? `${settings.passwordPolicy.minLength}+ characters and at least ${settings.passwordPolicy.requiredCharacterClasses} character types.` : undefined}
                        endAdornment={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword(v => !v)} />}
                      />}

                      {authMode === 'reset' && <Field
                        icon={Lock}
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm New Password"
                        autoComplete="new-password"
                        value={authForm.confirmPassword}
                        onChange={e => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                        minLength={settings.passwordPolicy.minLength}
                        maxLength={settings.passwordPolicy.maxLength}
                        required
                        error={passwordsMismatch ? 'Passwords do not match.' : undefined}
                        endAdornment={<PasswordToggle visible={showConfirmPassword} onToggle={() => setShowConfirmPassword(v => !v)} />}
                      />}

                      {authMode === 'login' && settings.passwordReset?.enabled && (
                        <button type="button" className="justify-self-end text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={() => setAuthMode('forgot')}>
                          Forgot password?
                        </button>
                      )}

                      <AnimatePresence mode="popLayout">
                        {authMode === 'register' && settings.registration.inviteRequired && (
                          <Field
                            key="invite-key"
                            icon={KeyRound}
                            placeholder="Invitation Key"
                            autoComplete="off"
                            value={authForm.inviteKey}
                            onChange={event => setAuthForm({ ...authForm, inviteKey: event.target.value })}
                            required
                          />
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {captchaRequired && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex max-w-full justify-center overflow-x-auto overflow-y-hidden pt-2"
                          >
                            <div className="min-h-[65px]">
                              <div ref={turnstileRef} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <motion.button
                        variants={authFieldVariants}
                        whileTap={{ scale: 0.985 }}
                        className={cn(
                          btn,
                          'group relative mt-2 min-h-11 w-full gap-2 rounded-xl text-sm font-bold shadow-sm transition-[background-color,box-shadow,transform]',
                          'bg-[var(--foreground)] text-[var(--background)]',
                          'hover:bg-[var(--foreground)]/90 hover:shadow-lg',
                          'focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                        disabled={busy || (captchaRequired && !turnstileToken) || (authMode === 'reset' && (passwordsMismatch || !authForm.password))}
                      >
                        {busy ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            {authMode === 'forgot' ? 'Sending link...' : authMode === 'reset' ? 'Updating password...' : 'Authenticating...'}
                          </>
                        ) : (
                          <>
                            {authMode === 'login' ? 'Sign In' : authMode === 'register' ? 'Create Account' : authMode === 'forgot' ? 'Send Reset Link' : 'Change Password'}
                            <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                          </>
                        )}
                      </motion.button>
                    </motion.div>
                  </form>
                )}

                {/* Social Identity Providers */}
                {!awaitingTwoFactor && !resetLinkSent && !passwordResetComplete && (authMode === 'login' || authMode === 'register') && socialProviders.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-xs font-medium text-[var(--muted-foreground)]">
                      <span className="h-px flex-1 bg-[var(--border)]/60" />
                      <span>OR</span>
                      <span className="h-px flex-1 bg-[var(--border)]/60" />
                    </div>
                    <div className="flex flex-col gap-2">
                      {socialProviders.map(provider => (
                        <button
                          key={provider.key}
                          type="button"
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)]/60 bg-[var(--secondary)]/10 px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--border)] hover:bg-[var(--secondary)]/30"
                          onClick={() => window.location.assign(`/api/auth/oauth/start?provider=${provider.key}`)}
                        >
                          <Image src={provider.iconUrl} alt="" width={18} height={18} />
                          Continue with {provider.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!awaitingTwoFactor && !resetLinkSent && !passwordResetComplete && (authMode === 'forgot' || authMode === 'reset') && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    onClick={backToSignIn}
                  >
                    <ArrowLeft size={14} />
                    Back to sign in
                  </button>
                )}

                {/* Multi-Factor Authentication Code Form */}
                {awaitingTwoFactor && (
                  <form onSubmit={handleTwoFactorSubmit} className="grid gap-4">
                    <Field
                      icon={KeyRound}
                      inputMode="text"
                      autoComplete="one-time-code"
                      placeholder="Authentication or recovery code"
                      value={twoFactorCode}
                      onChange={event => setTwoFactorCode(event.target.value)}
                      required
                      autoFocus
                    />
                    <button
                      className={cn(
                        btn,
                        'group relative h-11 gap-2 rounded-xl text-sm font-bold',
                        'bg-[var(--foreground)] text-[var(--background)]',
                        'hover:bg-[var(--foreground)]/90 hover:shadow-lg',
                        'focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                      disabled={busy || !twoFactorCode.trim()}
                    >
                      {busy
                        ? <Loader2 size={18} className="animate-spin" />
                        : <KeyRound size={18} className="transition-transform group-hover:scale-110 group-hover:text-[var(--primary)]" />
                      }
                      Verify and sign in
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      onClick={backToSignIn}
                    >
                      <ArrowLeft size={14} />
                      Back to sign in
                    </button>
                  </form>
                )}

                {/* API & Global Notifications */}
                <AnimatePresence>
                  {displayMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium',
                        apiError
                          ? 'border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive-foreground)]'
                          : 'border-[var(--border)]/60 bg-[var(--secondary)]/10 text-[var(--foreground)]'
                      )}
                    >
                      {apiError ? (
                        <XCircle size={18} className="mt-0.5 shrink-0 text-[var(--destructive)]" />
                      ) : (
                        <AlertCircle size={18} className="mt-0.5 shrink-0 text-[var(--primary)]" />
                      )}
                      <p className="leading-relaxed">{displayMessage}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Panel>
            </motion.div>
          </main>

          {/* Right Side: lightweight atmospheric branding */}
          <aside className="relative hidden flex-col justify-end overflow-hidden bg-[var(--background)] p-10 lg:col-span-7 lg:flex xl:col-span-8 xl:p-16">
            <DitheringBackdrop
              className="absolute inset-0 z-0 opacity-40 mix-blend-screen"
              colorBack={shaderColors.back}
              colorFront={shaderColors.front}
              speed={0.55}
              maxPixelCount={900_000}
            />
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_80%_20%,transparent_20%,var(--background)_80%)] pointer-events-none" />
            <div className="absolute inset-0 z-0 bg-gradient-to-t from-var(--background) via-transparent to-transparent opacity-90" />
            
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--background)] via-transparent to-transparent opacity-70" />

            {/* Staggered Branding Content */}
            <motion.div 
              variants={rightPanelStagger}
              initial="hidden"
              animate="show"
              className="relative z-10 max-w-6xl flex flex-col gap-4"
            >
              <motion.div variants={rightPanelItem} className="flex items-center gap-2">
                <span className="text-xs font-thin uppercase tracking-[0.3em] text-[var(--primary)] ">
                  {settings.branding.name}
                </span>
              </motion.div>

              <motion.h2 
                variants={rightPanelItem}
                className="max-w-4xl text-balance text-4xl font-extralight leading-[1.1] tracking-tight text-[var(--primary)] xl:text-5xl"
              >
                {settings.branding.tagline || 'Next generation architecture for your server management needs.'}
              </motion.h2>
            </motion.div>

          </aside>

        </div>
      </MotionConfig>
    </Shell>
  );
}
