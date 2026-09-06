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

  const strongPassword = Object.values(passwordRules).every(Boolean)

  const passwordsMatch =
    password.length > 0 && password === confirmPassword

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

    /*
      Local development is intentionally kept separate
      from Supabase authentication.
    */
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
          emailRedirectTo: `${window.location.origin}/verify-email`,

          data: {
            full_name: fullName.trim(),

            // Prepared for the future referral system.
            // The actual referral tracking and commission
            // system will be connected later.
            referral_code: referralCode.trim() || null,
          },
        },
      })

      if (error) {
        setMessage(error.message)
        setLoading(false)
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
      <div className="register-card">

        <h1>Create Your Account</h1>

        <p>
          Join Overmaths — Smart Exam Practice.
        </p>

        {!registered ? (
          <form onSubmit={handleRegister}>

            {/* Full Name */}
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={loading}
              autoComplete="name"
            />

            {/* Email */}
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />

            {/* Password */}
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {/* Password Rules */}
            <div className="password-rules">

              <p className={passwordRules.length ? 'valid' : 'invalid'}>
                {passwordRules.length ? '✓' : '✗'} At least 8 characters
              </p>

              <p className={passwordRules.uppercase ? 'valid' : 'invalid'}>
                {passwordRules.uppercase ? '✓' : '✗'} One uppercase letter
              </p>

              <p className={passwordRules.lowercase ? 'valid' : 'invalid'}>
                {passwordRules.lowercase ? '✓' : '✗'} One lowercase letter
              </p>

              <p className={passwordRules.number ? 'valid' : 'invalid'}>
                {passwordRules.number ? '✓' : '✗'} One number
              </p>

              <p className={passwordRules.special ? 'valid' : 'invalid'}>
                {passwordRules.special ? '✓' : '✗'} One special character
              </p>

            </div>

            {/* Confirm Password */}
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                disabled={loading}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {/* Password Match */}
            {confirmPassword.length > 0 && (
              <p className={passwordsMatch ? 'valid' : 'invalid'}>
                {passwordsMatch
                  ? '✓ Passwords match'
                  : '✗ Passwords do not match'}
              </p>
            )}

            {/* Referral Code */}
            <div className="referral-field">
              <input
                type="text"
                placeholder="Referral Code (Optional)"
                value={referralCode}
                onChange={(e) =>
                  setReferralCode(e.target.value.toUpperCase())
                }
                disabled={loading}
              />

              <small>
                Have a referral code? Enter it here.
              </small>
            </div>

            {/* Create Account */}
            <button
              type="submit"
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
                : 'Create Account'}
            </button>

          </form>
        ) : (
          <div className="registration-success">

            <div className="success-icon">
              ✓
            </div>

            <h2>Account Created!</h2>

            <p>
              We've sent a verification link to your email address.
            </p>

            <p>
              Please verify your email before signing in.
            </p>

            <Link
              to="/login"
              className="signin-btn"
            >
              Sign In
            </Link>

          </div>
        )}

        {message && !registered && (
          <p className="register-message">
            {message}
          </p>
        )}

        {!registered && (
          <div className="signin-section">

            <p>Already have an account?</p>

            <Link
              to="/login"
              className="signin-btn"
            >
              Sign In
            </Link>

          </div>
        )}

      </div>
    </div>
  )
}

export default Register