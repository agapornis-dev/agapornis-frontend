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
  Eye,
  EyeOff,
  MailCheck,
  CheckCircle2
} from 'lucide-react';

import { btn, inp } from '../../lib/constants';
import { PanelPublicSettings } from '../../lib/types';
import { Panel, Shell, cn } from '../ui';

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

const fieldVariants = {
  hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -8, filter: 'blur(4px)' }
};

function Field({
  icon: Icon,
  className,
  endAdornment,
  hint,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: typeof Mail;
  endAdornment?: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <motion.div variants={fieldVariants} className="relative group">
      <div className="relative">
        <Icon
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-colors group-focus-within:text-[var(--primary)]"
        />
        <input
          {...props}
          aria-invalid={!!error}
          className={cn(
            inp,
            'h-11 rounded-xl pl-10 text-sm transition-all font-medium',
            'bg-[var(--secondary)]/10 border-[var(--border)]/60',
            'focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30',
            endAdornment && 'pr-10',
            error && 'border-[var(--destructive)]/50 focus:border-[var(--destructive)] focus:ring-[var(--destructive)]/30',
            className
          )}
        />
        {endAdornment && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{endAdornment}</div>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 pl-1 text-xs font-medium text-[var(--destructive)]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 pl-1 text-xs font-medium text-[var(--muted-foreground)]/70">{hint}</p>
      ) : null}
    </motion.div>
  );
}

function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onToggle}
      aria-label={visible ? 'Hide password' : 'Show password'}
      className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
    >
      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

export function AuthScreen({ busy, message, settings, twoFactorRequired = false, resetToken = '', onSubmit, onTwoFactor, onRequestPasswordReset, onResetPassword }: AuthScreenProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(resetToken ? 'reset' : 'login');
  const [randomLoginGreeting, setRandomLoginGreeting] = useState('Welcome back');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', confirmPassword: '', inviteKey: '' });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [apiError, setApiError] = useState('');
  const [awaitingTwoFactor, setAwaitingTwoFactor] = useState(twoFactorRequired);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const [passwordResetComplete, setPasswordResetComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    const greetings = [
      'Welcome back',
      'Nice to see you',
      'Greetings!',
      'Good to see you again',
      'Ready to get started?'
    ];
    setRandomLoginGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
  }, []);

  useEffect(() => {
    if (!settings.registration.enabled && authMode === 'register') {
      setAuthMode('login');
    }
  }, [authMode, settings.registration.enabled]);

  useEffect(() => {
    setApiError('');
  }, [authMode]);

  // Reset transient flow state whenever the user leaves that flow (e.g. via
  // the tab switcher or "back to sign in"), so re-entering starts fresh.
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
          type: 'spring',
          stiffness: 420,
          damping: 34,
          mass: 0.8
        }}
      >
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-[420px]"
          >
            <Panel className="overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--background)]/50 shadow-xl backdrop-blur-sm">

              {/* Header */}
              <div className="px-8 pb-6 pt-8 border-b border-[var(--border)]/50">
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]"
                >
                  {settings.branding.name} Panel
                </motion.p>

                <AnimatePresence mode="wait">
                  <motion.h1
                    key={awaitingTwoFactor ? 'two-factor' : resetLinkSent ? 'reset-sent' : passwordResetComplete ? 'reset-done' : authMode}
                    initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                    className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]"
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
                              ? <>{randomLoginGreeting}<span className="text-[var(--primary)]">.</span></>
                              : <>Create account<span className="text-[var(--primary)]">.</span></>
                    }
                  </motion.h1>
                </AnimatePresence>

                <p className="mt-2 text-sm font-medium text-[var(--muted-foreground)]/80">
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
                          : settings.branding.tagline || 'Manage your servers with ease.'}
                </p>
              </div>

              {/* Body */}
              <div className="px-8 py-7 flex flex-col gap-6">

                {/* Login / Register tab switcher */}
                {!awaitingTwoFactor && (authMode === 'login' || authMode === 'register') && (
                  <div className="relative grid grid-cols-2 rounded-xl border border-[var(--border)]/60 bg-[var(--secondary)]/10 p-1">
                    {authMode === 'login' && (
                      <motion.div
                        layoutId="auth-active-tab"
                        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg border border-[var(--border)]/60 bg-[var(--background)] shadow-sm"
                      />
                    )}
                    {authMode === 'register' && (
                      <motion.div
                        layoutId="auth-active-tab"
                        className="absolute inset-y-1 left-[50%] w-[calc(50%-0.25rem)] rounded-lg border border-[var(--border)]/60 bg-[var(--background)] shadow-sm"
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

                {/* Forgot-password: confirmation state after the link has been sent */}
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
                    <div className="flex w-full gap-2">
                      <button
                        type="button"
                        className={cn(
                          btn,
                          'h-10 flex-1 rounded-xl border border-[var(--border)]/60 bg-[var(--secondary)]/10 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--secondary)]/30'
                        )}
                        onClick={() => setResetLinkSent(false)}
                      >
                        Try another email
                      </button>
                      <button
                        type="button"
                        className={cn(
                          btn,
                          'h-10 flex-1 rounded-xl bg-[var(--foreground)] text-sm font-semibold text-[var(--background)] hover:bg-[var(--foreground)]/90'
                        )}
                        onClick={backToSignIn}
                      >
                        Back to sign in
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Password reset: confirmation state after a successful change */}
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

                {/* Email / password form */}
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
                        minLength={8}
                        required
                        hint={authMode === 'register' || authMode === 'reset' ? 'At least 8 characters.' : undefined}
                        endAdornment={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword(v => !v)} />}
                      />}

                      {authMode === 'reset' && <Field
                        icon={Lock}
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm New Password"
                        autoComplete="new-password"
                        value={authForm.confirmPassword}
                        onChange={e => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                        minLength={8}
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
                            className="flex justify-center overflow-hidden pt-2"
                          >
                            <div className="min-h-[65px]">
                              <div ref={turnstileRef} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <motion.button
                        variants={fieldVariants}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.985 }}
                        className={cn(
                          btn,
                          'group relative mt-2 h-11 w-full gap-2 rounded-xl text-sm font-bold shadow-sm transition-all',
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

                {/* Social providers — below the primary submit button */}
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
                          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)]/60 bg-[var(--secondary)]/10 px-3 text-sm font-semibold text-[var(--foreground)] transition-all hover:bg-[var(--secondary)]/30 hover:border-[var(--border)]"
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

                {/* Two-factor form */}
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

                {/* Error / info message */}
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
              </div>
            </Panel>
          </motion.div>
        </div>
      </MotionConfig>
    </Shell>
  );
}