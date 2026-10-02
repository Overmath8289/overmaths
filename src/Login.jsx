import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
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
      // ======================================================
      // 1. AUTHENTICATE
      // ======================================================

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        console.error(
          'AUTHENTICATION ERROR:',
          authError
        )

        setMessage(
          authError.message ||
            'Unable to sign in. Please check your email and password.'
        )

        return
      }

      const authUser = authData?.user

      if (!authUser) {
        setMessage(
          'Login was unsuccessful. Please try again.'
        )
        return
      }

      // ======================================================
      // 2. GET STUDENT PROFILE
      //
      // IMPORTANT:
      // The actual database column is learning_route.
      // ======================================================

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('users')
        .select(`
          id,
          auth_user_id,
          email,
          full_name,
          learning_route,
          exam_type,
          subject,
          course
        `)
        .eq('auth_user_id', authUser.id)
        .maybeSingle()

      if (profileError) {
        console.error(
          'PROFILE ERROR:',
          profileError
        )

        setMessage(
          'We could not load your student profile. Please try again.'
        )

        return
      }

      // ======================================================
      // 3. NO PROFILE
      // ======================================================

      if (!profile) {
        navigate('/student-profile', {
          replace: true,
        })

        return
      }

      // ======================================================
      // 4. CHECK PROFILE COMPLETION
      // ======================================================

      const hasFullName =
        Boolean(profile.full_name?.trim())

      const hasLearningRoute =
        Boolean(profile.learning_route)

      const hasExamType =
        profile.learning_route === 'university'
          ? true
          : Boolean(profile.exam_type)

      const hasSubject =
        Boolean(profile.subject?.trim())

      const hasCourse =
        profile.learning_route === 'university'
          ? Boolean(profile.course?.trim())
          : true

      const profileComplete =
        hasFullName &&
        hasLearningRoute &&
        hasExamType &&
        hasSubject &&
        hasCourse

      if (!profileComplete) {
        navigate('/student-profile', {
          replace: true,
        })

        return
      }

      // ======================================================
      // 5. CHECK PREMIUM SUBSCRIPTION
      // ======================================================

      const now = new Date().toISOString()

      const {
        data: subscription,
        error: subscriptionError,
      } = await supabase
        .from('subscriptions')
        .select(`
          id,
          plan,
          status,
          started_at,
          expires_at
        `)
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .eq('plan', 'premium')
        .gt('expires_at', now)
        .order('expires_at', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle()

      if (subscriptionError) {
        console.error(
          'SUBSCRIPTION ERROR:',
          subscriptionError
        )

        navigate('/dashboard', {
          replace: true,
        })

        return
      }

      // ======================================================
      // 6. DESTINATION
      // ======================================================

      if (subscription) {
        navigate('/premium', {
          replace: true,
        })

        return
      }

      navigate('/dashboard', {
        replace: true,
      })

    } catch (error) {
      console.error(
        'LOGIN ERROR:',
        error
      )

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

      {/* ====================================================
          BACKGROUND
      ==================================================== */}

      <div className="login-background">

        <div className="login-glow login-glow-one"></div>

        <div className="login-glow login-glow-two"></div>

        <div className="login-glow login-glow-three"></div>

        <div className="login-grid"></div>

        <div className="login-orb login-orb-one"></div>

        <div className="login-orb login-orb-two"></div>

      </div>

      {/* ====================================================
          LOGIN CONTAINER
      ==================================================== */}

      <div className="login-container">

        <div className="login-card">

          {/* ==================================================
              LOGO
          ================================================== */}

          <div className="login-logo-wrapper">

            <img
              src="/overmaths-logo.png"
              alt="Overmaths"
              className="login-logo"
            />

          </div>

          {/* ==================================================
              BRAND
          ================================================== */}

          <div className="login-brand">

            <span>OVER</span>

            <span>MATHS</span>

          </div>

          {/* ==================================================
              HEADING
          ================================================== */}

          <h1>
            Welcome back
          </h1>

          <p className="login-subtitle">
            Sign in to continue your
            Overmaths learning journey.
          </p>

          {/* ==================================================
              FORM
          ================================================== */}

          <form onSubmit={handleLogin}>

            {/* EMAIL */}

            <div className="login-field">

              <label htmlFor="login-email">
                EMAIL
              </label>

              <div className="login-input-wrapper">

                <span className="login-input-icon">
                  @
                </span>

                <input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  autoComplete="email"
                  disabled={loading}
                />

              </div>

            </div>

            {/* PASSWORD */}

            <div className="login-field">

              <div className="password-label-row">

                <label htmlFor="login-password">
                  PASSWORD
                </label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={() =>
                    navigate('/forgot-password')
                  }
                  disabled={loading}
                >
                  Forgot password?
                </button>

              </div>

              <div className="login-input-wrapper">

                <span className="login-input-icon">
                  •
                </span>

                <input
                  id="login-password"
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
                  autoComplete="current-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  disabled={loading}
                >
                  {showPassword
                    ? 'HIDE'
                    : 'SHOW'}
                </button>

              </div>

            </div>

            {/* MESSAGE */}

            {message && (
              <div className="login-message">
                {message}
              </div>
            )}

            {/* LOGIN BUTTON */}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >

              <span>
                {loading
                  ? 'Signing in...'
                  : 'Sign In'}
              </span>

              {!loading && (
                <span className="login-arrow">
                  →
                </span>
              )}

            </button>

          </form>

          {/* ==================================================
              DIVIDER
          ================================================== */}

          <div className="login-divider">
            <span>NEW TO OVERMATHS?</span>
          </div>

          {/* ==================================================
              REGISTER
          ================================================== */}

          <div className="register-prompt">

            <p>
              Don't have an account?
            </p>

            <button
              type="button"
              className="register-link"
              onClick={() =>
                navigate('/register')
              }
              disabled={loading}
            >
              Create your Overmaths account →
            </button>

          </div>

          {/* ==================================================
              FOOTER
          ================================================== */}

          <div className="login-footer">

            <span>
              Smart Exam Practice
            </span>

            <span className="footer-dot">
              •
            </span>

            <span>
              Overmaths
            </span>

          </div>

        </div>

      </div>

    </div>
  )
}

export default Login