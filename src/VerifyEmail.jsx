
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  GraduationCap,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import { supabase } from './supabaseClient'
import './VerifyEmail.css'

export default function VerifyEmail() {
  const location = useLocation()
  const navigate = useNavigate()

  const [email, setEmail] = useState(location.state?.email || '')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email)
    }
  }, [location.state?.email])

  // Redirect when Supabase confirms the user's email and establishes
  // a session. The getUser check also handles an existing session.
  useEffect(() => {
    let active = true

    const goToProfile = () => {
      if (active) {
        navigate('/student-profile', { replace: true })
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        active &&
        session?.user?.email_confirmed_at &&
        ['SIGNED_IN', 'USER_UPDATED', 'INITIAL_SESSION'].includes(event)
      ) {
        goToProfile()
      }
    })

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (active && !error && data?.user?.email_confirmed_at) {
          goToProfile()
        }
      })
      .catch((error) => {
        console.error('Unable to check verification status:', error)
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [navigate])

  async function handleResend(event) {
    event.preventDefault()
    setMessage('')
    setMessageType('info')

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail) {
      setMessage('Enter the email address you used to register.')
      setMessageType('error')
      return
    }

    if (!supabase) {
      setMessage('The authentication service is unavailable. Please try again later.')
      setMessageType('error')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      })

      if (error) {
        throw error
      }

      setMessage(
        'Your verification email has been requested. Check your inbox and spam folder. If it does not arrive, try again later.'
      )
      setMessageType('success')
    } catch (error) {
      console.error('Resend verification error:', error)

      setMessage(
        error?.message ||
          'We could not request another verification email. Please try again later.'
      )
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="verify-page">
      <div
        className="verify-glow verify-glow-one"
        aria-hidden="true"
      />
      <div
        className="verify-glow verify-glow-two"
        aria-hidden="true"
      />

      <main className="verify-container">
        <Link
          to="/"
          className="verify-brand-top"
          aria-label="Overmaths home"
        >
          <span className="verify-brand-mark">
            <GraduationCap size={27} />
          </span>

          <span className="verify-brand-name">OVERMATHS</span>
          <span className="verify-brand-tagline">
            SMART EXAM PRACTICE
          </span>
        </Link>

        <section className="verify-panel">
          <div className="verify-icon-wrap">
            <div className="verify-success-icon">
              <Mail size={29} />
            </div>

            <span className="verify-icon-sparkle">
              <Sparkles size={16} />
            </span>
          </div>

          <div className="verify-eyebrow">
            <ShieldCheck size={15} />
            ACCOUNT VERIFICATION
          </div>

          <h1>Check your email</h1>

          <p className="verify-main-text">
            You're one step away from starting your Overmaths learning
            journey.
          </p>

          <p className="verify-description">
            Open the verification email and follow its link to activate
            your account. If you haven't received it, you can request
            another email below.
          </p>

          <form onSubmit={handleResend} className="verify-form">
            <div className="verify-field">
              <label htmlFor="verification-email">
                REGISTRATION EMAIL
              </label>

              <div className="verify-input-wrapper">
                <Mail
                  className="verify-input-icon"
                  size={19}
                  aria-hidden="true"
                />

                <input
                  id="verification-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email address"
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {message && (
              <div
                className={`verify-message ${messageType}`}
                role="status"
                aria-live="polite"
              >
                {messageType === 'success' ? (
                  <CheckCircle2 size={19} />
                ) : messageType === 'error' ? (
                  <CircleAlert size={19} />
                ) : (
                  <Mail size={19} />
                )}

                <span>{message}</span>
              </div>
            )}

            <button
              type="submit"
              className="verify-primary-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw
                    className="verify-spinner"
                    size={18}
                  />
                  Requesting email...
                </>
              ) : (
                <>
                  Resend verification email
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="verify-divider">
            <span>OR</span>
          </div>

          <Link
            to="/login"
            className="verify-secondary-btn"
          >
            Continue to Sign In
            <ArrowRight size={17} />
          </Link>

          <div className="verify-help">
            <div className="verify-help-icon">
              <CircleAlert size={19} />
            </div>

            <div className="verify-help-content">
              <strong>Still no email?</strong>

              <p>
                Check your spam or junk folder and make sure your email
                address is correct. If the email still doesn't arrive,
                your Supabase email provider or sending limits may need
                attention.
              </p>
            </div>
          </div>

          <Link to="/register" className="verify-back-link">
            <ArrowLeft size={15} />
            Back to Create Account
          </Link>
        </section>

        <footer className="verify-footer">
          <span>© {new Date().getFullYear()} Overmaths</span>
          <span className="verify-footer-dot">•</span>
          <span>Smart Exam Practice</span>
        </footer>
      </main>
    </div>
  )
}

