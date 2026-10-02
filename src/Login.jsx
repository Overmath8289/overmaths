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

  // ============================================================
  // PYTHON BACKEND
  // ============================================================

  onst BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL

  // ============================================================
  // LOGIN
  // ============================================================

  const handleLogin = async (e) => {
    e.preventDefault()
    setMessage('')

    // ========================================================
    // 1. VALIDATION
    // ========================================================

    if (!email.trim() || !password) {
      setMessage(
        'Please enter your email and password.'
      )
      return
    }

    // ========================================================
    // 2. SUPABASE CHECK
    // ========================================================

    if (!supabase) {
      setMessage(
        'Login is available on the live Overmaths website. Local testing is currently running without Supabase.'
      )
      return
    }

    setLoading(true)

    try {
      // ======================================================
      // 3. AUTHENTICATE WITH SUPABASE
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
      const session = authData?.session

      if (!authUser || !session?.access_token) {
        console.error(
          'LOGIN SESSION MISSING:',
          {
            authUser,
            session,
          }
        )

        setMessage(
          'Login succeeded but your session could not be created. Please try again.'
        )

        return
      }

      console.log(
        'AUTHENTICATED USER:',
        authUser.id
      )

      console.log(
        'SUPABASE SESSION FOUND:',
        Boolean(session.access_token)
      )

      // ======================================================
      // 4. GET STUDENT PROFILE
      //
      // auth_user_id = Supabase Auth UUID
      // id           = public.users ID
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
          exam_type
        `)
        .eq(
          'auth_user_id',
          authUser.id
        )
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
      // 5. NO PROFILE
      // ======================================================

      if (!profile) {
        console.log(
          'NO PROFILE FOUND:',
          authUser.id
        )

        navigate(
          '/student-profile',
          {
            replace: true,
          }
        )

        return
      }

      console.log(
        'STUDENT PROFILE:',
        profile
      )

      // ======================================================
      // 6. CHECK PROFILE COMPLETION
      // ======================================================

      const hasFullName =
        Boolean(
          profile.full_name?.trim()
        )

      const hasLearningRoute =
        Boolean(
          profile.learning_route
        )

      const hasExamType =
        profile.learning_route ===
        'university'
          ? true
          : Boolean(
              profile.exam_type
            )

      const profileComplete =
        hasFullName &&
        hasLearningRoute &&
        hasExamType

      if (!profileComplete) {
        console.log(
          'PROFILE INCOMPLETE:',
          {
            hasFullName,
            hasLearningRoute,
            hasExamType,
          }
        )

        navigate(
          '/student-profile',
          {
            replace: true,
          }
        )

        return
      }

      // ======================================================
      // 7. ASK PYTHON BACKEND FOR ACCESS
      //
      // IMPORTANT:
      //
      // We DO NOT check subscriptions directly here.
      //
      // Supabase Auth user ID:
      //
      // authUser.id
      //
      // Python backend receives the access token and resolves:
      //
      // auth.users.id
      //       ↓
      // public.users.auth_user_id
      //       ↓
      // public.users.id
      //       ↓
      // subscriptions.user_id
      //
      // This keeps the premium decision in one place.
      // ======================================================

      console.log(
        'CHECKING PREMIUM ACCESS THROUGH PYTHON BACKEND'
      )

      let backendResponse

      try {
        backendResponse = await fetch(
          `${BACKEND_URL}/api/auth/me`,
          {
            method: 'GET',

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,

              'Content-Type':
                'application/json',
            },
          }
        )
      } catch (backendConnectionError) {
        console.error(
          'PYTHON BACKEND CONNECTION ERROR:',
          backendConnectionError
        )

        setMessage(
          'We could not connect to the Overmaths server. Please make sure the Python backend is running.'
        )

        return
      }

      // ======================================================
      // 8. READ PYTHON RESPONSE
      // ======================================================

      let backendData = null

      try {
        backendData =
          await backendResponse.json()
      } catch (jsonError) {
        console.error(
          'INVALID PYTHON RESPONSE:',
          jsonError
        )

        setMessage(
          'The Overmaths server returned an invalid response.'
        )

        return
      }

      console.log(
        'PYTHON /api/auth/me RESPONSE:',
        backendData
      )

      // ======================================================
      // 9. BACKEND AUTHENTICATION FAILED
      // ======================================================

      if (
        !backendResponse.ok ||
        backendData?.authenticated !== true
      ) {
        console.error(
          'PYTHON AUTHENTICATION ERROR:',
          backendData
        )

        setMessage(
          backendData?.error ||
            'Unable to verify your Overmaths session.'
        )

        return
      }

      // ======================================================
      // 10. GET PREMIUM STATUS FROM PYTHON
      // ======================================================

      const premium =
        backendData?.is_premium === true ||
        backendData?.access_level ===
          'premium'

      console.log(
        'PYTHON PREMIUM STATUS:',
        backendData?.is_premium
      )

      console.log(
        'PYTHON ACCESS LEVEL:',
        backendData?.access_level
      )

      console.log(
        'PYTHON SUBSCRIPTION:',
        backendData?.subscription
      )

      console.log(
        'PYTHON SUBSCRIPTIONS:',
        backendData?.subscriptions
      )

      console.log(
        'FINAL PREMIUM ACCESS:',
        premium
      )

      // ======================================================
      // 11. FINAL DESTINATION
      // ======================================================

      if (premium === true) {
        console.log(
          'PREMIUM STUDENT → /premium'
        )

        navigate(
          '/premium',
          {
            replace: true,
          }
        )

        return
      }

      // ======================================================
      // NORMAL STUDENT
      // ======================================================

      console.log(
        'NORMAL STUDENT → /dashboard'
      )

      navigate(
        '/dashboard',
        {
          replace: true,
        }
      )

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

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="login-page">

      <div className="login-background">

        <div className="login-glow login-glow-one"></div>

        <div className="login-glow login-glow-two"></div>

        <div className="login-glow login-glow-three"></div>

        <div className="login-grid"></div>

        <div className="login-orb login-orb-one"></div>

        <div className="login-orb login-orb-two"></div>

      </div>

      <div className="login-container">

        <div className="login-card">

          <div className="login-logo-wrapper">

            <img
              src="/overmaths-logo.png"
              alt="Overmaths"
              className="login-logo"
            />

          </div>

          <div className="login-brand">

            <span>OVER</span>

            <span>MATHS</span>

          </div>

          <h1>
            Welcome back
          </h1>

          <p className="login-subtitle">
            Sign in to continue your
            Overmaths learning journey.
          </p>

          <form
            onSubmit={handleLogin}
          >

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
                    setEmail(
                      e.target.value
                    )
                  }
                  autoComplete="email"
                  disabled={loading}
                />

              </div>

            </div>

            <div className="login-field">

              <div className="password-label-row">

                <label htmlFor="login-password">
                  PASSWORD
                </label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={() =>
                    navigate(
                      '/forgot-password'
                    )
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
                    setPassword(
                      e.target.value
                    )
                  }
                  autoComplete="current-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current
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

            {message && (
              <div className="login-message">
                {message}
              </div>
            )}

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

          <div className="login-divider">

            <span>
              NEW TO OVERMATHS?
            </span>

          </div>

          <div className="register-prompt">

            <p>
              Don't have an account?
            </p>

            <button
              type="button"
              className="register-link"
              onClick={() =>
                navigate(
                  '/register'
                )
              }
              disabled={loading}
            >
              Create your Overmaths account →
            </button>

          </div>

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