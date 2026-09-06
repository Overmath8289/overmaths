import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './Login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()

    setMessage('')

    if (!email.trim()) {
      setMessage('Please enter your email address.')
      return
    }

    if (!password) {
      setMessage('Please enter your password.')
      return
    }

    /*
      Local development is intentionally kept separate
      from Supabase authentication.
    */
    if (!supabase) {
      setMessage(
        'Login is available on the live Overmaths website. Local testing is currently running without Supabase.'
      )
      return
    }

    setLoading(true)

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      /*
        Supabase normally prevents unverified users from
        signing in when email confirmation is required.

        This additional check gives us a safe layer for
        future authentication rules.
      */
      if (data?.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut()

        setMessage(
          'Please verify your email address before signing in. Check your inbox for the verification email.'
        )

        setLoading(false)
        return
      }

      // Temporary destination.
      // Later this will become /dashboard.
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
      <div className="login-card">

        <div className="login-logo">
          <img
            src="/src/assets/overmaths-logo.png"
            alt="Overmaths Logo"
          />
        </div>

        <h1>Welcome Back</h1>

        <p>
          Sign in to continue practicing with Overmaths.
        </p>

        <form onSubmit={handleLogin}>

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
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
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

          {/* Forgot Password */}
          <div className="forgot-password">
            <Link to="/forgot-password">
              Forgot Password?
            </Link>
          </div>

          {/* Sign In */}
          <button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

        </form>

        {message && (
          <p className="login-message">
            {message}
          </p>
        )}

        <div className="register-link">
          <p>Don't have an account?</p>

          <Link to="/register">
            Create an Account
          </Link>
        </div>

      </div>
    </div>
  )
}

export default Login