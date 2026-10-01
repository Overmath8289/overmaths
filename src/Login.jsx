import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './Login.css'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // ============================================================
  // LOGIN
  // ============================================================

  const handleLogin = async (e) => {
    e.preventDefault()
    setMessage('')

    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    if (!email.trim() || !password) {
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
      // 1. AUTHENTICATE USER
      // ========================================================

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

      // ========================================================
      // 2. GET STUDENT PROFILE
      //
      // IMPORTANT:
      // Supabase uses learning_route.
      // There is NO "path" column.
      // ========================================================

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

      // ========================================================
      // 3. NO PROFILE FOUND
      // ========================================================

      if (!profile) {

        console.log(
          'No student profile found for:',
          authUser.id
        )

        navigate('/student-profile', {
          replace: true,
        })

        return
      }

      // ========================================================
      // 4. CHECK PROFILE COMPLETION
      // ========================================================

      const hasFullName =
        Boolean(
          profile.full_name?.trim()
        )

      const hasLearningRoute =
        Boolean(
          profile.learning_route
        )

      // O-Level requires an exam type.
      // University does not.
      const hasExamType =
        profile.learning_route ===
        'university'
          ? true
          : Boolean(
              profile.exam_type
            )

      const hasSubject =
        Boolean(
          profile.subject?.trim()
        )

      // University requires course.
      // O-Level does not.
      const hasCourse =
        profile.learning_route ===
        'university'
          ? Boolean(
              profile.course?.trim()
            )
          : true

      const profileComplete =
        hasFullName &&
        hasLearningRoute &&
        hasExamType &&
        hasSubject &&
        hasCourse

      // ========================================================
      // 5. PROFILE NOT COMPLETE
      // ========================================================

      if (!profileComplete) {

        console.log(
          'Student profile incomplete:',
          {
            fullName: hasFullName,
            learningRoute: hasLearningRoute,
            examType: hasExamType,
            subject: hasSubject,
            course: hasCourse,
          }
        )

        navigate('/student-profile', {
          replace: true,
        })

        return
      }

      // ========================================================
      // 6. CHECK PREMIUM SUBSCRIPTION
      // ========================================================

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
        .eq(
          'user_id',
          profile.id
        )
        .eq(
          'status',
          'active'
        )
        .eq(
          'plan',
          'premium'
        )
        .gt(
          'expires_at',
          now
        )
        .order(
          'expires_at',
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle()

      // --------------------------------------------------------
      // Subscription error
      //
      // Do NOT prevent login if subscription checking fails.
      // Send the student to the normal dashboard.
      // --------------------------------------------------------

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

      // ========================================================
      // 7. PREMIUM USER
      // ========================================================

      if (subscription) {

        navigate('/premium', {
          replace: true,
        })

        return
      }

      // ========================================================
      // 8. NORMAL STUDENT
      // ========================================================

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

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="login-page">

      <div className="login-card">

        <h1>
          Welcome back
        </h1>

        <p>
          Sign in to continue your
          Overmaths learning journey.
        </p>

        <form
          onSubmit={handleLogin}
        >

          {/* EMAIL */}

          <div className="login-field">

            <label>
              EMAIL
            </label>

            <input
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

          {/* PASSWORD */}

          <div className="login-field">

            <label>
              PASSWORD
            </label>

            <input
              type="password"
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

          </div>

          {/* FORGOT PASSWORD */}

          <button
            type="button"
            className="forgot-password-button"
            onClick={() =>
              navigate(
                '/forgot-password'
              )
            }
            disabled={loading}
          >
            Forgot password?
          </button>

          {/* ERROR / MESSAGE */}

          {message && (
            <div className="login-message">
              {message}
            </div>
          )}

          {/* LOGIN */}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >

            {loading
              ? 'Signing in...'
              : 'Sign In'}

          </button>

        </form>

        {/* REGISTER */}

        <div className="login-register">

          <span>
            Don't have an account?
          </span>

          <button
            type="button"
            onClick={() =>
              navigate('/register')
            }
            disabled={loading}
          >
            Create account
          </button>

        </div>

      </div>

    </div>
  )
}

export default Login