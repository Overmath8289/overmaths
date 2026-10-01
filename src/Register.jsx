import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './Register.css'

function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [message, setMessage] = useState('')
  const [registered, setRegistered] = useState(false)
  const [loading, setLoading] = useState(false)

  const passwordRules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }

  const strongPassword =
    Object.values(passwordRules).every(Boolean)

  const passwordsMatch =
    password.length > 0 &&
    password === confirmPassword

  const handleRegister = async (e) => {
    e.preventDefault()

    setMessage('')

    if (!fullName.trim()) {
      setMessage('Please enter your full name.')
      return
    }

    if (!email.trim()) {
      setMessage('Please enter your email address.')
      return
    }

    if (!strongPassword) {
      setMessage('Please meet all password requirements.')
      return
    }

    if (!passwordsMatch) {
      setMessage('Passwords do not match.')
      return
    }

    if (!supabase) {
      setMessage(
        'Account registration is available on the live Overmaths website. Local testing is currently running without Supabase.'
      )
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo:
            `${window.location.origin}/verify-email`,

          data: {
            full_name: fullName.trim(),
            referral_code:
              referralCode.trim() || null,
          },
        },
      })

      if (error) {
        setMessage(error.message)
        return
      }

      setRegistered(true)

      setMessage(
        'Registration successful! Please check your email and click the verification link to activate your account.'
      )

      setFullName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setReferralCode('')

    } catch (error) {
      setMessage(
        error?.message ||
          'Something went wrong while creating your account. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">

      {/* Background decoration */}
      <div className="register-glow register-glow-one" />
      <div className="register-glow register-glow-two" />

      <main className="register-container">

        {/* Brand */}
        <div className="register-brand">
          <img
            src="/src/assets/overmaths-logo.png"
            alt="Overmaths"
          />

          <span>
            Smart Exam Practice
          </span>
        </div>

        <section className="register-panel">

          {!registered ? (

            <>
              <div className="register-heading">

                <div className="register-icon">
                  +
                </div>

                <div>
                  <div className="register-eyebrow">
                    JOIN OVERMATHS
                  </div>

                  <h1>
                    Create your account
                  </h1>
                </div>

              </div>

              <p className="register-intro">
                Start practising smarter and build the confidence
                you need for your exams.
              </p>

              <form onSubmit={handleRegister}>

                {/* Full name */}
                <div className="register-field">

                  <label>
                    Full Name
                  </label>

                  <div className="input-shell">
                    <span className="input-icon">
                      ◯
                    </span>

                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) =>
                        setFullName(e.target.value)
                      }
                      required
                      disabled={loading}
                      autoComplete="name"
                    />
                  </div>

                </div>

                {/* Email */}
                <div className="register-field">

                  <label>
                    Email Address
                  </label>

                  <div className="input-shell">
                    <span className="input-icon">
                      @
                    </span>

                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      required
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>

                </div>

                {/* Password */}
                <div className="register-field">

                  <label>
                    Password
                  </label>

                  <div className="input-shell">

                    <span className="input-icon">
                      •••
                    </span>

                    <input
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      required
                      disabled={loading}
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      disabled={loading}
                      aria-label={
                        showPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>

                  </div>

                </div>

                {/* Password strength */}
                <div className="password-rules">

                  <div className="password-rules-title">
                    Password requirements
                  </div>

                  <div className="password-rule-grid">

                    <span className={
                      passwordRules.length
                        ? 'rule-valid'
                        : ''
                    }>
                      {passwordRules.length ? '✓' : '○'}
                      &nbsp; 8+ characters
                    </span>

                    <span className={
                      passwordRules.uppercase
                        ? 'rule-valid'
                        : ''
                    }>
                      {passwordRules.uppercase ? '✓' : '○'}
                      &nbsp; Uppercase
                    </span>

                    <span className={
                      passwordRules.lowercase
                        ? 'rule-valid'
                        : ''
                    }>
                      {passwordRules.lowercase ? '✓' : '○'}
                      &nbsp; Lowercase
                    </span>

                    <span className={
                      passwordRules.number
                        ? 'rule-valid'
                        : ''
                    }>
                      {passwordRules.number ? '✓' : '○'}
                      &nbsp; Number
                    </span>

                    <span className={
                      passwordRules.special
                        ? 'rule-valid'
                        : ''
                    }>
                      {passwordRules.special ? '✓' : '○'}
                      &nbsp; Special character
                    </span>

                  </div>

                </div>

                {/* Confirm password */}
                <div className="register-field">

                  <label>
                    Confirm Password
                  </label>

                  <div className="input-shell">

                    <span className="input-icon">
                      •••
                    </span>

                    <input
                      type={
                        showConfirmPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.target.value)
                      }
                      required
                      disabled={loading}
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                      disabled={loading}
                    >
                      {showConfirmPassword
                        ? 'Hide'
                        : 'Show'}
                    </button>

                  </div>

                  {confirmPassword.length > 0 && (
                    <div
                      className={
                        passwordsMatch
                          ? 'password-match valid-match'
                          : 'password-match invalid-match'
                      }
                    >
                      {passwordsMatch
                        ? '✓ Passwords match'
                        : '× Passwords do not match'}
                    </div>
                  )}

                </div>

                {/* Referral */}
                <div className="register-field">

                  <label>
                    Referral Code
                    <span>Optional</span>
                  </label>

                  <div className="input-shell">

                    <span className="input-icon">
                      #
                    </span>

                    <input
                      type="text"
                      placeholder="Enter referral code"
                      value={referralCode}
                      onChange={(e) =>
                        setReferralCode(
                          e.target.value.toUpperCase()
                        )
                      }
                      disabled={loading}
                    />

                  </div>

                  <small className="field-hint">
                    Have a referral code? Enter it here.
                  </small>

                </div>

                {/* Message */}
                {message && (
                  <div className="register-message">
                    {message}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  className="register-submit"
                  disabled={
                    loading ||
                    !strongPassword ||
                    !passwordsMatch ||
                    !fullName.trim() ||
                    !email.trim()
                  }
                >
                  {loading
                    ? 'Creating Account...'
                    : 'Create My Account'}

                  {!loading && (
                    <span>→</span>
                  )}
                </button>

              </form>

              {/* Login */}
              <div className="register-login">

                <span>
                  Already have an account?
                </span>

                <Link to="/login">
                  Sign In
                </Link>

              </div>

            </>

          ) : (

            <div className="registration-success">

              <div className="success-icon">
                ✓
              </div>

              <div className="register-eyebrow">
                ACCOUNT CREATED
              </div>

              <h1>
                You're almost there!
              </h1>

              <p>
                We've sent a verification link to your
                email address.
              </p>

              <p className="success-secondary">
                Verify your email before signing in to
                your Overmaths account.
              </p>

              <Link
                to="/verify-email"
                className="success-primary-btn"
              >
                Continue to Verification
                <span>→</span>
              </Link>

              <Link
                to="/login"
                className="success-login-link"
              >
                Go to Sign In
              </Link>

            </div>

          )}

        </section>

        <footer className="register-footer">
          © {new Date().getFullYear()} Overmaths
          <span>•</span>
          Smart Exam Practice
        </footer>

      </main>

    </div>
  )
}

export default Register