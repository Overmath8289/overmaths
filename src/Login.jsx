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

    if (!supabase) {
      setMessage(
        'Login is available on the live Overmaths website.'
      )
      return
    }

    setLoading(true)

    try {
      /*
       * 1. AUTHENTICATE USER
       */
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
       * 2. CHECK EMAIL VERIFICATION
       */
      if (!authUser.email_confirmed_at) {
        await supabase.auth.signOut()

        setMessage(
          'Please verify your email address before signing in.'
        )

        return
      }

      /*
       * 3. GET USER PROFILE
       */
      const { data: profile, error: profileError } =
        await supabase
          .from('users')
          .select('id, role')
          .eq('auth_user_id', authUser.id)
          .single()

      if (profileError || !profile) {
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
       * 4. ADMIN
       */
      if (profile.role === 'admin') {
        navigate('/admin')
        return
      }

      /*
       * 5. STUDENT
       *
       * IMPORTANT:
       * We now check the subscriptions table.
       *
       * This means the login page itself decides whether
       * the student belongs in the normal or premium area.
       */

      if (profile.role === 'student') {
        const now = new Date().toISOString()

        const { data: subscriptions, error: subscriptionError } =
          await supabase
            .from('subscriptions')
            .select(
              'id, plan, status, started_at, expires_at'
            )
            .eq('user_id', profile.id)
            .eq('plan', 'premium')
            .eq('status', 'active')
            .gt('expires_at', now)
            .order('expires_at', {
              ascending: false,
            })
            .limit(1)

        if (subscriptionError) {
          console.error(
            'Subscription lookup error:',
            subscriptionError
          )

          await supabase.auth.signOut()

          setMessage(
            'We could not verify your subscription. Please try again.'
          )

          return
        }

        const activePremium =
          subscriptions &&
          subscriptions.length > 0

        /*
         * PREMIUM STUDENT
         */
        if (activePremium) {
          navigate('/premium-dashboard')
          return
        }

        /*
         * NORMAL STUDENT
         */
        navigate('/student-profile')
        return
      }

      /*
       * 6. UNKNOWN ROLE
       */
      await supabase.auth.signOut()

      setMessage(
        'Your account role is not recognized. Please contact Overmaths support.'
      )
    } catch (error) {
      console.error('Login error:', error)

      setMessage(
        error?.message ||
          'Something went wrong while signing in.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">

      {/* LEFT BRAND AREA */}
      <section className="login-brand">

        <div className="brand-overlay"></div>

        <div className="brand-content">

          <img
            src="/src/assets/overmaths-logo.png"
            alt="Overmaths"
            className="login-brand-logo"
          />

          <div className="brand-line"></div>

          <p className="brand-kicker">
            SMART EXAM PRACTICE
          </p>

          <h2>
            Practice smarter.
            <br />
            <span>Master your exams.</span>
          </h2>

          <p className="brand-description">
            Structured practice, instant feedback and
            meaningful progress for serious students.
          </p>

          <div className="brand-features">

            <div className="brand-feature">
              <span className="brand-feature-icon">✓</span>
              <span>Exam-focused practice</span>
            </div>

            <div className="brand-feature">
              <span className="brand-feature-icon">◈</span>
              <span>Track your progress</span>
            </div>

            <div className="brand-feature">
              <span className="brand-feature-icon">★</span>
              <span>Premium learning tools</span>
            </div>

          </div>

        </div>

      </section>


      {/* RIGHT LOGIN AREA */}
      <section className="login-panel">

        <div className="login-container">

          <div className="mobile-logo">
            <img
              src="/src/assets/overmaths-logo.png"
              alt="Overmaths"
            />
          </div>

          <div className="login-heading">

            <span className="login-eyebrow">
              STUDENT PORTAL
            </span>

            <h1>
              Welcome back
            </h1>

            <p>
              Sign in to continue your learning journey.
            </p>

          </div>


          <form
            className="login-form"
            onSubmit={handleLogin}
          >

            {/* EMAIL */}
            <div className="input-group">

              <label htmlFor="email">
                Email address
              </label>

              <div className="input-shell">

                <span className="input-icon">
                  @
                </span>

                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  disabled={loading}
                  autoComplete="email"
                />

              </div>

            </div>


            {/* PASSWORD */}
            <div className="input-group">

              <div className="label-row">

                <label htmlFor="password">
                  Password
                </label>

                <Link to="/forgot-password">
                  Forgot password?
                </Link>

              </div>

              <div className="input-shell">

                <span className="input-icon">
                  •••
                </span>

                <input
                  id="password"
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  disabled={loading}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="password-eye"
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
                  {showPassword ? '◉' : '◌'}
                </button>

              </div>

            </div>


            {/* MESSAGE */}
            {message && (
              <div className="login-message">
                {message}
              </div>
            )}


            {/* SUBMIT */}
            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              <span>
                {loading
                  ? 'Signing in...'
                  : 'Sign in'}
              </span>

              {!loading && (
                <span className="submit-arrow">
                  →
                </span>
              )}

            </button>

          </form>


          {/* REGISTER */}
          <div className="login-register">

            <span>
              Don't have an account?
            </span>

            <Link to="/register">
              Create an account
            </Link>

          </div>


          <div className="login-footer">
            <span>
              Overmaths
            </span>

            <span>•</span>

            <span>
              Smart Exam Practice
            </span>
          </div>

        </div>

      </section>

    </div>
  )
}

export default Login