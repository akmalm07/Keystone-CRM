import { useState, useEffect } from 'react'
import { PublicBrand, publicField, publicPrimary, publicSecondary } from '../components/public/PublicBrand'
import { useAuth } from '../hooks/useAuth'
import { Link, useNavigate } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { BACKEND_URL } from '../consts'

export function LoginPage() {
  const { login, signup, authError, authLoading, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Once auth state updates, navigate to the correct page.
  // This is the single place that decides where to send the user.
  useEffect(() => {
    if (!isAuthenticated || !user) return

    if (user.source === 'manual' && !user.emailConfirmed) {
      navigate('/onboard', { replace: true })
    } else if (!user.onboardComplete) {
      navigate('/onboard', { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  const handleGoogleAuth = async (authMode: 'login' | 'signup') => {
    setGoogleLoading(true)
    setLocalError(null)

    const endpoint = authMode === 'login' ? 'login' : 'signup'

    try {
        window.location.href = `${BACKEND_URL}auth/google/${endpoint}`
    } catch {
      setLocalError(`Failed to connect to Google ${authMode}.`)
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (mode === 'signup') {
      if (!name.trim()) {
        setLocalError('Please enter your full name.')
        return
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.')
        return
      }
      if (password.length < 8) {
        setLocalError('Password must be at least 8 characters.')
        return
      }
      try {
        await signup(name, email, password)
        // No navigate() here — useEffect above handles it once user state updates
      } catch {
        // authError is set inside useAuth — displayed below
      }
    } else {
      try {
        await login(email, password)
        // No navigate() here — useEffect above handles it once user state updates
      } catch {
        // authError is set inside useAuth
      }
    }
  }

  const displayError = localError ?? authError

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#172033]">
      <header className="mx-auto max-w-7xl px-6 py-5 lg:px-8"><PublicBrand /></header>
      <div className="mx-auto max-w-md px-6 pb-12 pt-10 sm:pt-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="mb-2 text-3xl font-semibold tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-sm text-slate-600">
              {mode === 'login'
                ? 'Sign in to your account to continue'
                : 'Set up your Keystone workspace'}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 bg-[#f7f8fa] border border-[#e5e7eb] rounded-lg p-1 mb-6">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setLocalError(null)
                }}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                  mode === m
                    ? 'bg-white text-[#172033] shadow-sm'
                    : 'text-[#475569] hover:text-[#172033]'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {mode === 'signup' && (
            <div className="mb-5 flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden="true" />
              <p>Unauthorized emails will not be able to sign up. <Link to="/request-access" className="font-semibold underline underline-offset-2">Request access</Link> to get approved.</p>
            </div>
          )}

          {/* Google OAuth button */}
          <button
            type="button"
            onClick={() => handleGoogleAuth(mode)}
            disabled={googleLoading}
            className={publicSecondary + ' mb-4 w-full'}
          >
            {googleLoading ? (
              <svg className="w-4 h-4 animate-spin text-[#4f46e5]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e5e7eb]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-600">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name — signup only */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="auth-full-name" className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</label>
                <input
                  id="auth-full-name"
                type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Johnson"
                  className={publicField}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-slate-700">Email Address</label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={publicField}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="auth-password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <input
                id="auth-password"
                type="password"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={publicField}
              />
            </div>

            {/* Confirm Password — signup only */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="auth-confirm-password" className="mb-1.5 block text-sm font-medium text-slate-700">Confirm Password</label>
                <input
                  id="auth-confirm-password"
                type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={publicField}
                />
              </div>
            )}

            {/* Error */}
            {displayError && (
              <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-xs text-red-600">{displayError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={authLoading}
              className={publicPrimary + ' w-full'}
            >
              {authLoading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : null}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#e5e7eb]">
            <p className="text-xs text-center text-slate-600">
              By continuing, you agree to our{' '}
              <a href="/terms" className="text-[#4f46e5] hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="text-[#4f46e5] hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © {new Date().getFullYear()} Keystone CRM. All rights reserved.
        </p>
      </div>
    </div>
  )
}
