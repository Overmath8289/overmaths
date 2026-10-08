
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
  UserRound,
  Users,
  ShieldCheck,
  LoaderCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { supabase } from './supabaseClient'
import './Register.css'

function Register() {
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [registered, setRegistered] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    setMessage('')

    const cleanName = fullName.trim()
    const cleanEmail = email.trim().toLowerCase()
    const cleanReferralCode = referralCode.trim()

    if (!cleanName || !cleanEmail || !password) {
      setMessage('Please complete all required fields.')
      return
    }

    if (password.length < 8) {
      setMessage('Your password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Your passwords do not match.')
      return
    }

    if (!supabase) {
      setMessage(
        'Registration requires a working Supabase connection. Please check your environment variables.'
      )
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            full_name: cleanName,
            referral_code: cleanReferralCode || null,
          },
        },
      })

      if (error) {
        setMessage(error.message || 'Unable to create your account.')
        return
      }

      if (!data?.user) {
        setMessage(
          'We could not complete your registration. Please try again.'
        )
        return
      }

      setRegistered(true)
      setMessageType('success')
      setMessage(
        'Your account request was received. Check your inbox for the verification email.'
      )
    } catch (error) {
      console.error('Registration error:', error)
      setMessage(
        error.message || 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (registered) {
    return (
      <div className="register-page">
        <div className="register-success-card">
          <div className="register-success-icon">
            <CheckCircle2 size={38} />
          </div>

          <p className="register-eyebrow">ONE LAST STEP</p>

          <h1>Check your email.</h1>

          <p className="register-success-description">
            We've submitted your registration for
            <strong> {email.trim()}</strong>.
            If email confirmation is enabled, open the verification
            message and follow its instructions to activate your account.
          </p>

          <div className="register-success-note">
            <Mail size={21} />
            <span>
              Can't find the email? Check your spam or junk folder.
            </span>
          </div>

          <button
            type="button"
            className="register-submit"
            onClick={() =>
              navigate('/verify-email', {
                state: { email: email.trim() },
              })
            }
          >
            <span>Continue to verification</span>
            <ArrowRight size={18} />
          </button>

          <p className="register-bottom-text">
            Already verified?{' '}
            <button
              type="button"
              className="register-inline-link"
              onClick={() => navigate('/login')}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="register-page">
      <div className="register-layout">
        <aside className="register-brand-panel">
          <button
            type="button"
            className="register-brand"
            onClick={() => navigate('/')}
            aria-label="Go to Overmaths home"
          >
            <span className="register-brand-mark">
              <GraduationCap size={26} />
            </span>
            <span>OVERMATHS</span>
          </button>

          <div className="register-brand-content">
            <span className="register-brand-tag">
              <Sparkles size={15} />
              YOUR NEXT LEVEL STARTS HERE
            </span>

            <h1>
              Turn your
              <span> potential </span>
              into performance.
            </h1>

            <p>
              Build confidence, practise smarter, and prepare for your
              next exam with Overmaths.
            </p>

            <div className="register-benefit">
              <span><CheckCircle2 size={19} /></span>
              <div>
                <strong>Focused practice</strong>
                <p>Work on the subjects that matter to you.</p>
              </div>
            </div>

            <div className="register-benefit">
              <span><CheckCircle2 size={19} /></span>
              <div>
                <strong>Track your progress</strong>
                <p>Build better learning habits over time.</p>
              </div>
            </div>

            <div className="register-benefit">
              <span><ShieldCheck size={19} /></span>
              <div>
                <strong>Your learning journey</strong>
                <p>Start with your own student account.</p>
              </div>
            </div>
          </div>

          <p className="register-brand-footer">
            Smart Exam Practice · Overmaths
          </p>
        </aside>

        <main className="register-form-panel">
          <div className="register-form-container">
            <div className="register-mobile-brand">
              <span className="register-brand-mark">
                <GraduationCap size={24} />
              </span>
              <strong>OVERMATHS</strong>
            </div>

            <div className="register-heading">
              <span className="register-heading-icon">
                <UserRound size={20} />
              </span>

              <p className="register-eyebrow">CREATE YOUR ACCOUNT</p>

              <h2>Your journey starts here.</h2>

              <p>
                Create your account and get ready to learn smarter.
              </p>
            </div>

            <form onSubmit={handleRegister} className="register-form">
              <div className="register-field">
                <label htmlFor="register-name">FULL NAME</label>

                <div className="register-input-wrapper">
                  <UserRound className="register-input-icon" size={19} />

                  <input
                    id="register-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="register-field">
                <label htmlFor="register-email">EMAIL ADDRESS</label>

                <div className="register-input-wrapper">
                  <Mail className="register-input-icon" size={19} />

                  <input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="register-field">
                <label htmlFor="register-password">PASSWORD</label>

                <div className="register-input-wrapper">
                  <LockKeyhole
                    className="register-input-icon"
                    size={19}
                  />

                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="register-password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              <div className="register-field">
                <label htmlFor="register-confirm-password">
                  CONFIRM PASSWORD
                </label>

                <div className="register-input-wrapper">
                  <ShieldCheck
                    className="register-input-icon"
                    size={19}
                  />

                  <input
                    id="register-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Enter your password again"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="register-password-toggle"
                    onClick={() =>
                      setShowConfirmPassword((value) => !value)
                    }
                    aria-label={
                      showConfirmPassword
                        ? 'Hide confirmation password'
                        : 'Show confirmation password'
                    }
                    disabled={loading}
                  >
                    {showConfirmPassword
                      ? <EyeOff size={19} />
                      : <Eye size={19} />}
                  </button>
                </div>
              </div>

              <div className="register-field">
                <label htmlFor="register-referral">
                  REFERRAL CODE <span>(OPTIONAL)</span>
                </label>

                <div className="register-input-wrapper">
                  <Users className="register-input-icon" size={19} />

                  <input
                    id="register-referral"
                    type="text"
                    placeholder="Enter a referral code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    autoComplete="off"
                    disabled={loading}
                  />
                </div>
              </div>

              {message && (
                <div
                  className={`register-message ${
                    messageType === 'success' ? 'success' : 'error'
                  }`}
                  role="alert"
                >
                  <AlertCircle size={18} />
                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                className="register-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoaderCircle className="register-spinner" size={19} />
                    <span>Creating your account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={19} />
                  </>
                )}
              </button>
            </form>

            <div className="register-divider">
              <span>ALREADY PART OF OVERMATHS?</span>
            </div>

            <div className="register-login-prompt">
              <p>Already have an account?</p>

              <button
                type="button"
                className="register-inline-link"
                onClick={() => navigate('/login')}
                disabled={loading}
              >
                Sign in to your account <ArrowRight size={16} />
              </button>
            </div>

            <p className="register-terms">
              By creating an account, you agree to use Overmaths
              responsibly for your learning.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Register

