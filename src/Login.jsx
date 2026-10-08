import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { getCurrentAccess } from './services/subscriptionApi'
import './Login.css'


function Login() {

  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] =
    useState(false)

  const [loading, setLoading] =
    useState(false)

  const [message, setMessage] =
    useState('')


  // ============================================================
  // LOGIN
  // ============================================================

  const handleLogin = async (e) => {

    e.preventDefault()

    setMessage('')


    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    if (
      !email.trim() ||
      !password
    ) {

      setMessage(
        'Please enter your email and password.'
      )

      return
    }


    // ----------------------------------------------------------
    // SUPABASE CHECK
    // ----------------------------------------------------------

    if (!supabase) {

      setMessage(
        'Login is available on the live Overmaths website. Local testing is currently running without Supabase.'
      )

      return
    }


    setLoading(true)


    try {

      // ========================================================
      // 1. AUTHENTICATE WITH SUPABASE
      // ========================================================

      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })


      // --------------------------------------------------------
      // AUTH ERROR
      // --------------------------------------------------------

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


      // --------------------------------------------------------
      // AUTH USER
      // --------------------------------------------------------

      const authUser =
        authData?.user


      if (!authUser) {

        setMessage(
          'Login was unsuccessful. Please try again.'
        )

        return
      }


      console.log(
        'AUTHENTICATED USER:',
        authUser.id
      )


      // ========================================================
      // 2. ASK PYTHON FOR ACCOUNT ACCESS
      // ========================================================
      //
      // Python checks:
      //
      // Supabase authentication
      //        ↓
      // Student profile
      //        ↓
      // Email verification
      //        ↓
      // Subscription
      //        ↓
      // Premium status
      //
      // React does NOT query subscriptions directly.
      //
      // ========================================================

      const access =
        await getCurrentAccess()


      console.log(
        'OVERMATHS ACCESS:',
        access
      )


      // ========================================================
      // 3. EMAIL VERIFICATION
      // ========================================================

      if (
        access?.verified !== true
      ) {

        console.log(
          'EMAIL NOT VERIFIED'
        )

        navigate(
          '/verify-email',
          {
            replace: true,
          }
        )

        return
      }


      // ========================================================
      // 4. STUDENT PROFILE
      // ========================================================

      if (
        !access?.profile
      ) {

        console.log(
          'NO STUDENT PROFILE'
        )

        navigate(
          '/student-profile',
          {
            replace: true,
          }
        )

        return
      }


      // ========================================================
      // 5. PROFILE COMPLETION
      // ========================================================

      if (
        access?.profile_complete !== true
      ) {

        console.log(
          'PROFILE INCOMPLETE'
        )

        navigate(
          '/student-profile',
          {
            replace: true,
          }
        )

        return
      }


      // ========================================================
      // 6. PREMIUM CHECK
      // ========================================================

      console.log(
        'BACKEND PREMIUM STATUS:',
        access?.is_premium
      )

      console.log(
        'BACKEND ACCESS LEVEL:',
        access?.access_level
      )


      // ========================================================
      // 7. PREMIUM STUDENT
      // ========================================================

      if (
        access?.is_premium === true
      ) {

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


      // ========================================================
      // 8. NORMAL / FREE STUDENT
      // ========================================================

      console.log(
        'NORMAL STUDENT → /dashboard'
      )

      navigate(
        '/dashboard',
        {
          replace: true,
        }
      )

    }


    // ==========================================================
    // LOGIN ERROR
    // ==========================================================

    catch (error) {

      console.error(
        'LOGIN ERROR:',
        error
      )

      setMessage(
        error?.message ||
        'Something went wrong while signing in. Please try again.'
      )

    }


    // ==========================================================
    // FINISH
    // ==========================================================

    finally {

      setLoading(false)

    }

  }


  // ============================================================
  // PAGE
  // ============================================================

  return (

    <div className="login-page">


      {/* ====================================================
          BACKGROUND
      ==================================================== */}

      <div className="login-background">

        <div
          className="login-glow login-glow-one"
        />

        <div
          className="login-glow login-glow-two"
        />

        <div
          className="login-glow login-glow-three"
        />

        <div className="login-grid" />

        <div
          className="login-orb login-orb-one"
        />

        <div
          className="login-orb login-orb-two"
        />

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

            <span>
              OVER
            </span>

            <span>
              MATHS
            </span>

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

          <form
            onSubmit={handleLogin}
          >


            {/* EMAIL */}

            <div className="login-field">

              <label
                htmlFor="login-email"
              >
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


            {/* PASSWORD */}

            <div className="login-field">

              <div className="password-label-row">

                <label
                  htmlFor="login-password"
                >
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

            <span>
              NEW TO OVERMATHS?
            </span>

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