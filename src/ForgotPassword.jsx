import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './ForgotPassword.css'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleResetRequest = async (e) => {
    e.preventDefault()

    setMessage('')
    setSuccess(false)

    if (!email.trim()) {
      setMessage('Please enter your email address.')
      return
    }

    /*
      Local development is intentionally kept separate
      from Supabase authentication.
    */
    if (!supabase) {
      setMessage(
        'Password recovery is available on the live Overmaths website. Local testing is currently running without Supabase.'
      )
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      )

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      setSuccess(true)

      setMessage(
        'Password reset link sent! Please check your email.'
      )
    } catch (error) {
      setMessage(
        error?.message ||
          'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="forgot-page">
      <div className="forgot-card">

        <div className="forgot-logo">
          <img
            src="/src/assets/overmaths-logo.png"
            alt="Overmaths Logo"
          />
        </div>

        {!success ? (
          <>
            <h1>Forgot Password?</h1>

            <p className="forgot-description">
              Enter the email address associated with your
              Overmaths account and we'll send you a link to
              create a new password.
            </p>

            <form onSubmit={handleResetRequest}>

              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
              />

              <button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? 'Sending...'
                  : 'Send Reset Link'}
              </button>

            </form>

            {message && (
              <p className="forgot-message">
                {message}
              </p>
            )}

            <div className="forgot-back">
              <Link to="/login">
                ← Back to Sign In
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="success-icon">
              ✓
            </div>

            <h1>Check Your Email</h1>

            <p className="forgot-description">
              We've sent a password reset link to:
            </p>

            <strong className="reset-email">
              {email}
            </strong>

            <p className="forgot-description">
              Open the email and click the link to create
              your new password.
            </p>

            <div className="forgot-highlight">
              <strong>Didn't receive the email?</strong>

              <p>
                Check your spam or junk folder. Make sure you
                entered the email address associated with your
                Overmaths account.
              </p>
            </div>

            <Link
              to="/login"
              className="back-login-btn"
            >
              Back to Sign In
            </Link>
          </>
        )}

        <div className="forgot-brand">
          <span>Overmaths</span>
          <small>Smart Exam Practice</small>
        </div>

      </div>
    </div>
  )
}

export default ForgotPassword