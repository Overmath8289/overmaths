
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
  BookOpen,
  TrendingUp,
  Target,
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
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email)
    }
  }, [location.state?.email])

  useEffect(() => {
    let active = true

    const checkVerifiedUser = (user) => {
      if (active && user?.email_confirmed_at) {
        setEmail((current) => current || user.email || '')
        setVerified(true)
        setMessage('')
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        ['SIGNED_IN', 'USER_UPDATED', 'INITIAL_SESSION'].includes(event)
      ) {
        checkVerifiedUser(session?.user)
      }
    })

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!error && active) {
          checkVerifiedUser(data?.user)
        }
      })
      .catch((error) => {
        console.error('Verification status check failed:', error)
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

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

    setLoading(true)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      })

      if (error) throw error

      setMessage(
        'Your request was submitted. Check your inbox and spam folder. If the email does not arrive, you may need to wait before trying again.'
      )
      setMessageType('success')
    } catch (error) {
      console.error('Resend verification error:', error)
      setMessage(
        error?.message ||
          'We could not request another email. Please try again later.'
      )
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  function continueToLogin() {
    navigate('/login', {
      replace: true,
      state: { email },
    })
  }

  return (
    <div className="verify-page">
      <div className="verify-decoration verify-decoration-one" aria-hidden="true">
        +
      </div>
      <div className="verify-decoration verify-decoration-two" aria-hidden="true">
        π
      </div>
      <div className="verify-decoration verify-decoration-three" aria-hidden="true">
        x²
      </div>

      <main className="verify-container">
        <Link to="/" className="verify-brand-top" aria-label="Overmaths home">
          <span className="verify-brand-mark">
            <GraduationCap size={28} strokeWidth={2.2} />
          </span>
          <span className="verify-brand-name">Overmaths</span>
          <span className="verify-brand-tagline">
            LEARN • PRACTICE • EXCEL
          </span>
        </Link>

        <section className="verify-panel">
          <div className={`verify-icon-wrap ${verified ? 'is-verified' : ''}`}>
            <div className="verify-success-icon">
              {verified ? (
                <CheckCircle2 size={36} strokeWidth={1.8} />
              ) : (
                <Mail size={34} strokeWidth={1.8} />
              )}
            </div>
            <span className="verify-icon-sparkle">
              <Sparkles size={16} />
            </span>
          </div>

          {verified ? (
            <>
              <div className="verify-eyebrow">
                <ShieldCheck size={16} />
                EMAIL CONFIRMED
              </div>

              <h1>Email verified successfully!</h1>

              <p className="verify-main-text">
                Welcome to Overmaths! Your next step towards exam success
                starts here.
              </p>

              {email && (
                <div className="verify-confirmed-email">
                  <CheckCircle2 size={18} />
                  <span>{email}</span>
                </div>
              )}

              <p className="verify-description">
                Your email has been confirmed. Continue to sign in to your
                account and start your learning journey.
              </p>

              <button
                type="button"
                className="verify-primary-btn"
                onClick={continueToLogin}
              >
                Continue to Login
                <ArrowRight size={19} />
              </button>

              <div className="verify-benefits">
                <h2>Your learning journey awaits</h2>
                <div className="verify-benefit">
                  <span className="verify-benefit-icon">
                    <BookOpen size={19} />
                  </span>
                  <span>
                    <strong>Practice with purpose</strong>
                    <small>Prepare with exam-focused questions.</small>
                  </span>
                </div>
                <div className="verify-benefit">
                  <span className="verify-benefit-icon">
                    <TrendingUp size={19} />
                  </span>
                  <span>
                    <strong>Track your progress</strong>
                    <small>See how your knowledge improves.</small>
                  </span>
                </div>
                <div className="verify-benefit">
                  <span className="verify-benefit-icon">
                    <Target size={19} />
                  </span>
                  <span>
                    <strong>Build exam confidence</strong>
                    <small>Take the next step towards your goals.</small>
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="verify-eyebrow">
                <ShieldCheck size={16} />
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
                      <RefreshCw className="verify-spinner" size={18} />
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

              <Link to="/login" state={{ email }} className="verify-secondary-btn">
                Continue to Login
                <ArrowRight size={18} />
              </Link>

              <div className="verify-help">
                <div className="verify-help-icon">
                  <CircleAlert size={19} />
                </div>
                <div className="verify-help-content">
                  <strong>Still no email?</strong>
                  <p>
                    Check your spam or junk folder and make sure your email
                    address is correct. You may also need to wait if the
                    email service has reached its sending limit.
                  </p>
                </div>
              </div>

              <Link to="/register" className="verify-back-link">
                <ArrowLeft size={16} />
                Back to Create Account
              </Link>
            </>
          )}
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