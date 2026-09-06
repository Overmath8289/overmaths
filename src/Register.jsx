import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './Register.css'

function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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

    if (!strongPassword) {
      setMessage('Please meet all password requirements.')
      return
    }

    if (!passwordsMatch) {
      setMessage('Passwords do not match.')
      return
    }

    setLoading(true)
    setMessage('')
    setRegistered(false)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
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

    setLoading(false)
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

            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

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

            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {confirmPassword.length > 0 && (
              <p className={passwordsMatch ? 'valid' : 'invalid'}>
                {passwordsMatch
                  ? '✓ Passwords match'
                  : '✗ Passwords do not match'}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !strongPassword || !passwordsMatch}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
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