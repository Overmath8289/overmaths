import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import logo from './assets/overmaths-logo.png'
import './Login.css'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setMessage('')

    if (!email.trim() || !password) {
      setMessage('Please enter your email and password.')
      return
    }

    if (!supabase) {
      setMessage(
        'Login is available on the live Overmaths website. Local testing is currently running without Supabase.'
      )
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setMessage(error.message)
        return
      }

      navigate('/')
    } catch (error) {
      setMessage(
        error?.message ||
          'Something went wrong while signing in. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">

      {/* Animated background */}
      <div className="login-background">
        <div className="login-glow login-glow-one"></div>
        <div className="login-glow login-glow-two"></div>
        <div className="login-glow login-glow-three"></div>

        <div className="login-grid"></div>

        <div className="login-orb login-orb-one"></div>
        <div className="login-orb login-orb-two"></div>
      </div>

      {/* Login content */}
      <main className="login-container">

        <div className="login-card">

          {/* Logo */}
          <div className="login-logo-wrapper">
            <img
              src={logo}
              alt="Overmaths"
              className="login-logo"
            />
          </div>

          <div className="login-brand">
            <span>OVER</span>
            <span>MATHS</span>
          </div>

          <h1>Welcome Back</h1>

          <p className="login-subtitle">
            Sign in to continue your smart exam practice.
          </p>

          <form onSubmit={handleLogin}>

            {/* Email */}
            <div className="login-field">

              <label htmlFor="email">
                Email Address
              </label>

              <div className="login-input-wrapper">

                <span className="login-input-icon">
                  @
                </span>

                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                  required
                />

              </div>

            </div>

            {/* Password */}
            <div className="login-field">

              <div className="password-label-row">

                <label htmlFor="password">
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="forgot-password"
                >
                  Forgot password?
                </Link>

              </div>

              <div className="login-input-wrapper">

                <span className="login-input-icon">
                  •
                </span>

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  required
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

            </div>

            {/* Message */}
            {message && (
              <div className="login-message">
                {message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              <span>
                {loading
                  ? 'Signing In...'
                  : 'Sign In'}
              </span>

              {!loading && (
                <span className="login-arrow">
                  →
                </span>
              )}
            </button>

          </form>

          {/* Divider */}
          <div className="login-divider">
            <span>OR</span>
          </div>

          {/* Register */}
          <div className="register-prompt">

            <p>
              Don't have an Overmaths account?
            </p>

            <Link
              to="/register"
              className="register-link"
            >
              Create an Account
            </Link>

          </div>

          {/* Footer */}
          <div className="login-footer">

            <span>
              Overmaths
            </span>

            <span className="footer-dot">
              •
            </span>

            <span>
              Smart Exam Practice
            </span>

          </div>

        </div>

      </main>

    </div>
  )
}

export default Login