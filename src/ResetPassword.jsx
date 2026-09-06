import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './ResetPassword.css'

function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

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

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()

    setMessage('')

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
        'Password reset is available on the live Overmaths website. Local testing is currently running without Supabase.'
      )
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      setSuccess(true)

      /*
        Give Supabase a moment to finish the password update
        before moving the user to the login page.
      */
      setTimeout(() => {
        supabase.auth.signOut()
        navigate('/login')
      }, 2500)
    } catch (error) {
      setMessage(
        error?.message ||
          'Something went wrong while updating your password.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="reset-page">
      <div className="reset-card">

        <div className="reset-logo">
          <img
            src="/src/assets/overmaths-logo.png"
            alt="Overmaths Logo"
          />
        </div>

        {!success ? (
          <>
            <h1>Create New Password</h1>

            <p className="reset-description">
              Create a strong new password for your Overmaths
              account.
            </p>

            <form onSubmit={handlePasswordUpdate}>

              {/* New Password */}
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Password Rules */}
              <div className="password-rules">

                <p
                  className={
                    passwordRules.length
                      ? 'valid'
                      : 'invalid'
                  }
                >
                  {passwordRules.length ? '✓' : '✗'} At least
                  8 characters
                </p>

                <p
                  className={
                    passwordRules.uppercase
                      ? 'valid'
                      : 'invalid'
                  }
                >
                  {passwordRules.uppercase ? '✓' : '✗'} One
                  uppercase letter
                </p>

                <p
                  className={
                    passwordRules.lowercase
                      ? 'valid'
                      : 'invalid'
                  }
                >
                  {passwordRules.lowercase ? '✓' : '✗'} One
                  lowercase letter
                </p>

                <p
                  className={
                    passwordRules.number
                      ? 'valid'
                      : 'invalid'
                  }
                >
                  {passwordRules.number ? '✓' : '✗'} One
                  number
                </p>

                <p
                  className={
                    passwordRules.special
                      ? 'valid'
                      : 'invalid'
                  }
                >
                  {passwordRules.special ? '✓' : '✗'} One
                  special character
                </p>

              </div>

              {/* Confirm Password */}
              <div className="password-input-wrapper">
                <input
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  placeholder="Confirm New Password"
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
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              {confirmPassword.length > 0 && (
                <p
                  className={
                    passwordsMatch ? 'valid' : 'invalid'
                  }
                >
                  {passwordsMatch
                    ? '✓ Passwords match'
                    : '✗ Passwords do not match'}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  !strongPassword ||
                  !passwordsMatch
                }
              >
                {loading
                  ? 'Updating Password...'
                  : 'Update Password'}
              </button>

            </form>

            {message && (
              <p className="reset-message">
                {message}
              </p>
            )}

            <div className="reset-back">
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

            <h1>Password Updated!</h1>

            <p className="reset-description">
              Your Overmaths password has been changed
              successfully.
            </p>

            <p className="reset-description">
              Redirecting you to the sign-in page...
            </p>

            <Link
              to="/login"
              className="back-login-btn"
            >
              Sign In Now
            </Link>
          </>
        )}

        <div className="reset-brand">
          <span>Overmaths</span>
          <small>Smart Exam Practice</small>
        </div>

      </div>
    </div>
  )
}

export default ResetPassword