
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
      // 1. Sign in with Supabase Authentication
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

      if (error) {
        setMessage(error.message)
        return
      }

      const authUser = data?.user

      if (!authUser) {
        setMessage(
          'Login could not be completed. Please try again.'
        )
        return
      }

      /*
        Supabase normally prevents unverified users from
        signing in when email confirmation is required.

        This additional check gives us a safe layer for
        future authentication rules.
      */
      if (!authUser.email_confirmed_at) {
        await supabase.auth.signOut()

        setMessage(
          'Please verify your email address before signing in. Check your inbox for the verification email.'
        )

        return
      }

      /*
        2. Find the user's record in the public.users table.

        auth_user_id in public.users must match
        the authenticated Supabase user's ID.
      */
      const { data: profile, error: profileError } =
        await supabase
          .from('users')
          .select('role')
          .eq('auth_user_id', authUser.id)
          .single()

      if (profileError) {
        console.error(
          'Profile lookup error:',
          profileError
        )

        await supabase.auth.signOut()

        setMessage(
          'Your account profile could not be found. Please contact Overmaths support.'
        )

        return
      }

      /*
        3. Route according to the role stored in
        public.users.
      */

      if (profile.role === 'admin') {
        navigate('/admin')
        return
      }

      if (profile.role === 'student') {
        navigate('/student-profile')
        return
      }

      /*
        If a role exists but is not one of the roles
        supported by the application.
      */
      await supabase.auth.signOut()

      setMessage(
        'Your account role is not recognized. Please contact Overmaths support.'
      )
    } catch (error) {
      console.error('Login error:', error)

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

