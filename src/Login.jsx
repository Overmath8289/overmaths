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

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!email.trim() || !password) {
      setMessage('Please enter your email and password.')
      return
    }

    if (!supabase) {
      setMessage(
        'Login is currently unavailable because Supabase is not connected.'
      )
      return
    }

    setLoading(true)

    try {
      // =====================================================
      // 1. AUTHENTICATE WITH SUPABASE
      // =====================================================

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        console.error('AUTH ERROR:', authError)

        setMessage(
          authError.message ||
            'Invalid email or password.'
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

      // =====================================================
      // 2. LOAD STUDENT PROFILE
      // =====================================================

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
          path,
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

      // =====================================================
      // 3. CHECK PROFILE COMPLETION
      // =====================================================

      const hasFullName =
        Boolean(profile?.full_name?.trim())

      const hasPath =
        Boolean(profile?.path)

      /*
        O-Level requires:
        - full name
        - path
        - exam type
        - subject

        University requires:
        - full name
        - path
        - subject
        - course

        We don't require exam_type for University.
      */

      const hasExamType =
        profile?.path === 'university'
          ? true
          : Boolean(profile?.exam_type)

      const hasSubject =
        Boolean(profile?.subject)

      const hasCourse =
        profile?.path === 'university'
          ? Boolean(profile?.course)
          : true

      const profileComplete =
        Boolean(profile) &&
        hasFullName &&
        hasPath &&
        hasExamType &&
        hasSubject &&
        hasCourse

      // =====================================================
      // 4. SEND INCOMPLETE PROFILE TO STUDENT PROFILE
      // =====================================================

      if (!profileComplete) {
        navigate('/student-profile', {
          replace: true,
        })

        return
      }

      // =====================================================
      // 5. CHECK PREMIUM SUBSCRIPTION
      // =====================================================

      const now =
        new Date().toISOString()

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

      // =====================================================
      // 6. SUBSCRIPTION LOOKUP ERROR
      // =====================================================

      if (subscriptionError) {
        console.error(
          'SUBSCRIPTION ERROR:',
          subscriptionError
        )

        /*
          Do not prevent the student from entering
          the normal dashboard if subscription lookup
          has a problem.
        */

        navigate('/dashboard', {
          replace: true,
        })

        return
      }

      // =====================================================
      // 7. PREMIUM USER
      // =====================================================

      if (subscription) {
        navigate('/premium', {
          replace: true,
        })

        return
      }

      // =====================================================
      // 8. NORMAL / FREE USER
      // =====================================================

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

      {/* =================================================
          ANIMATED BACKGROUND
      ================================================= */}

      <div className="login-background">

        <div className="login-glow login-glow-one"></div>

        <div className="login-glow login-glow-two"></div>

        <div className="login-glow login-glow-three"></div>

        <div className="login-grid"></div>

        <div className="login-orb login-orb-one"></div>

        <div className="login-orb login-orb-two"></div>

      </div>


      {/* =================================================
          LOGIN CONTENT
      ================================================= */}

      <main className="login-container">

        <div className="login-card">

          {/* =================================================
              LOGO
          ================================================= */}

          <div className="login-logo-wrapper">

            <img
              src={logo}
              alt="Overmaths"
              className="login-logo"
            />

          </div>


          {/* =================================================
              BRAND
          ================================================= */}

          <div className="login-brand">

            <span>
              OVER
            </span>

            <span>
              MATHS
            </span>

          </div>


          {/* =================================================
              HEADING
          ================================================= */}

          <h1>
            Welcome Back
          </h1>

          <p className="login-subtitle">
            Sign in to continue your smart exam practice.
          </p>


          {/* =================================================
              LOGIN FORM
          ================================================= */}

          <form onSubmit={handleLogin}>

            {/* =================================================
                EMAIL
            ================================================= */}

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
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  disabled={loading}
                  autoComplete="email"
                  required
                />

              </div>

            </div>


            {/* =================================================
                PASSWORD
            ================================================= */}

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
                  required
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
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword
                    ? 'Hide'
                    : 'Show'}
                </button>

              </div>

            </div>


            {/* =================================================
                MESSAGE
            ================================================= */}

            {message && (
              <div className="login-message">
                {message}
              </div>
            )}


            {/* =================================================
                SUBMIT BUTTON
            ================================================= */}

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


          {/* =================================================
              DIVIDER
          ================================================= */}

          <div className="login-divider">
            <span>
              OR
            </span>
          </div>


          {/* =================================================
              REGISTER
          ================================================= */}

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


          {/* =================================================
              FOOTER
          ================================================= */}

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