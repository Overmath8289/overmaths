import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  LoaderCircle,
  AlertCircle,
} from 'lucide-react'

import { supabase } from './supabaseClient'
import { hasPremiumAccess } from './services/subscriptionApi'
import './Login.css'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')

  function showFeedback(text, type = 'error') {
    setMessage(text)
    setMessageType(type)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setMessage('')

    if (!email.trim() || !password) {
      showFeedback('Please enter your email and password.')
      return
    }

    if (!supabase) {
      showFeedback(
        'Login is unavailable in this environment because Supabase is not configured.'
      )
      return
    }

    setLoading(true)

    try {
      // 1. Authenticate with Supabase.
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

      if (authError) {
        showFeedback(
          authError.message ||
            'Unable to sign in. Please check your email and password.'
        )
        return
      }

      const authUser = authData?.user

      if (!authUser) {
        showFeedback('Login was unsuccessful. Please try again.')
        return
      }

      // 2. Find the matching Overmaths student profile.
      const { data: profile, error: profileError } =
        await supabase
          .from('users')
          .select(`
            id,
            auth_user_id,
            email,
            full_name,
            learning_route,
            exam_type
          `)
          .eq('auth_user_id', authUser.id)
          .maybeSingle()

      if (profileError) {
        console.error('PROFILE ERROR:', profileError)
        showFeedback(
          'We could not load your student profile. Please try again.'
        )
        return
      }

      // 3. Send students without a profile to profile setup.
      if (!profile) {
        navigate('/student-profile', { replace: true })
        return
      }

      // 4. Check that the profile is complete.
      const hasFullName = Boolean(profile.full_name?.trim())
      const hasLearningRoute = Boolean(profile.learning_route)

      const hasExamType =
        profile.learning_route === 'university'
          ? true
          : Boolean(profile.exam_type)

      const profileComplete =
        hasFullName && hasLearningRoute && hasExamType

      if (!profileComplete) {
        navigate('/student-profile', { replace: true })
        return
      }

      // 5. Check premium access using the app profile ID.
      // subscriptions.user_id references users.id, not authUser.id.
      let premium = false

      try {
        const premiumResult = await hasPremiumAccess(profile.id)

        premium = premiumResult?.isPremium === true

        if (premiumResult?.error) {
          console.error(
            'PREMIUM CHECK ERROR:',
            premiumResult.error
          )
          premium = false
        }
      } catch (subscriptionError) {
        console.error(
          'PREMIUM CHECK ERROR:',
          subscriptionError
        )
        premium = false
      }

      // 6. Preserve the existing destinations.
      if (premium) {
        navigate('/premium', { replace: true })
        return
      }

      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error('LOGIN ERROR:', error)

      showFeedback(
        error?.message ||
          'Something went wrong while signing in. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-ambient login-ambient-one" />
      <div className="login-ambient login-ambient-two" />

      <div className="login-layout">
        {/* Brand panel */}
        <aside className="login-showcase">
          <button
            type="button"
            className="login-brand"
            onClick={() => navigate('/')}
            aria-label="Go to Overmaths home"
          >
            <span className="login-brand-mark">
              <GraduationCap size={25} strokeWidth={2.1} />
            </span>

            <span>
              <strong>OVER<span>MATHS</span></strong>
              <small>YOUR EXAM SUCCESS PARTNER</small>
            </span>
          </button>

          <div className="login-showcase-content">
            <span className="login-pill">
              <Sparkles size={14} />
              YOUR LEARNING JOURNEY CONTINUES
            </span>

            <h1>
              Learn smarter.
              <br />
              <span>Score higher.</span>
            </h1>

            <p>
              Your next breakthrough starts with one focused
              practice session. Sign in and keep moving forward.
            </p>

            <div className="login-benefit-list">
              <div>
                <span className="login-benefit-icon">
                  <CheckCircle2 size={18} />
                </span>
                <span>
                  <strong>Focused exam practice</strong>
                  <small>Build confidence one question at a time.</small>
                </span>
              </div>

              <div>
                <span className="login-benefit-icon">
                  <ShieldCheck size={18} />
                </span>
                <span>
                  <strong>Your progress, in one place</strong>
                  <small>Continue your learning journey securely.</small>
                </span>
              </div>
            </div>
          </div>

          <div className="login-showcase-footer">
            <span className="login-footer-dot" />
            Built for learners who want to do better.
          </div>
        </aside>

        {/* Login form */}
        <section className="login-form-side">
          <div className="login-mobile-brand">
            <span className="login-brand-mark">
              <GraduationCap size={24} />
            </span>
            <strong>OVER<span>MATHS</span></strong>
          </div>

          <div className="login-card">
            <div className="login-heading-icon">
              <LockKeyhole size={23} />
            </div>

            <p className="login-eyebrow">WELCOME BACK</p>

            <h2>Sign in to Overmaths</h2>

            <p className="login-subtitle">
              Enter your details to continue learning.
            </p>

            <form onSubmit={handleLogin} className="login-form">
              <div className="login-field">
                <label htmlFor="login-email">Email address</label>

                <div className="login-input-wrapper">
                  <Mail
                    className="login-input-icon"
                    size={19}
                    aria-hidden="true"
                  />

                  <input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoCapitalize="none"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="login-field">
                <div className="login-password-heading">
                  <label htmlFor="login-password">Password</label>

                  <button
                    type="button"
                    className="login-text-button"
                    onClick={() => navigate('/forgot-password')}
                    disabled={loading}
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="login-input-wrapper">
                  <LockKeyhole
                    className="login-input-icon"
                    size={19}
                    aria-hidden="true"
                  />

                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    aria-pressed={showPassword}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>

              {message && (
                <div
                  className={`login-feedback ${messageType}`}
                  role="alert"
                >
                  <AlertCircle size={18} />
                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoaderCircle className="login-spinner" size={19} />
                    Signing you in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={19} />
                  </>
                )}
              </button>
            </form>

            <div className="login-divider">
              <span>NEW TO OVERMATHS?</span>
            </div>

            <p className="login-register-prompt">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                disabled={loading}
              >
                Create account <ArrowRight size={15} />
              </button>
            </p>

            <div className="login-security-note">
              <ShieldCheck size={16} />
              <span>Your learning account is protected.</span>
            </div>
          </div>

          <p className="login-copyright">
            © {new Date().getFullYear()} Overmaths. Keep learning. Keep growing.
          </p>
        </section>
      </div>
    </main>
  )
}

export default Login