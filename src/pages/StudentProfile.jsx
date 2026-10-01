import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import logo from '../assets/overmaths-logo.png'
import './StudentProfile.css'

function StudentProfile() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [step, setStep] = useState(1)

  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [learningRoute, setLearningRoute] = useState('')
  const [examType, setExamType] = useState('')

  // ============================================================
  // LOAD CURRENT USER + PROFILE
  // ============================================================

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      if (!supabase) {
        setMessage('Supabase is not connected.')
        setLoading(false)
        return
      }

      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !currentUser) {
        navigate('/login', { replace: true })
        return
      }

      setUser(currentUser)

      // --------------------------------------------------------
      // Load nickname from Supabase Auth metadata
      // --------------------------------------------------------

      setNickname(
        currentUser.user_metadata?.nickname || ''
      )

      // --------------------------------------------------------
      // Load student profile
      //
      // IMPORTANT:
      // These are the ONLY profile columns currently
      // available in your users table.
      // --------------------------------------------------------

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
        .eq('auth_user_id', currentUser.id)
        .maybeSingle()

      if (profileError) {
        console.error(
          'PROFILE LOAD ERROR:',
          profileError
        )

        setMessage(
          'Unable to load your student profile.'
        )

        return
      }

      if (profile) {
        setFullName(profile.full_name || '')
        setLearningRoute(
          profile.learning_route || ''
        )
        setExamType(profile.exam_type || '')
      }

    } catch (error) {
      console.error(
        'PROFILE ERROR:',
        error
      )

      setMessage(
        'Unable to load your profile.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // NEXT STEP
  // ============================================================

  const nextStep = () => {
    setMessage('')

    // STEP 1
    if (step === 1) {
      if (!fullName.trim()) {
        setMessage(
          'Please enter your full name.'
        )
        return
      }

      if (!nickname.trim()) {
        setMessage(
          'Please choose a nickname.'
        )
        return
      }
    }

    // STEP 2
    if (step === 2) {
      if (!learningRoute) {
        setMessage(
          'Please select your learning path.'
        )
        return
      }
    }

    // STEP 3
    if (step === 3) {
      if (learningRoute === 'olevel') {
        if (!examType) {
          setMessage(
            'Please select your examination.'
          )
          return
        }
      }
    }

    setStep(
      (current) =>
        Math.min(current + 1, 4)
    )
  }

  // ============================================================
  // PREVIOUS STEP
  // ============================================================

  const previousStep = () => {
    setMessage('')

    setStep(
      (current) =>
        Math.max(current - 1, 1)
    )
  }

  // ============================================================
  // SAVE PROFILE
  // ============================================================

  const saveProfile = async () => {
    setMessage('')

    if (!supabase || !user) {
      setMessage(
        'Supabase is not connected.'
      )
      return
    }

    setSaving(true)

    try {
      // --------------------------------------------------------
      // 1. SAVE NAME + NICKNAME TO AUTH METADATA
      // --------------------------------------------------------

      const {
        error: authError,
      } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          nickname: nickname.trim(),
        },
      })

      if (authError) {
        throw authError
      }

      // --------------------------------------------------------
      // 2. SAVE PROFILE
      //
      // IMPORTANT:
      // Only columns that actually exist in your
      // users table are used here.
      // --------------------------------------------------------

      const {
        error: profileError,
      } = await supabase
        .from('users')
        .upsert(
          {
            auth_user_id: user.id,
            email: user.email,
            full_name: fullName.trim(),

            learning_route:
              learningRoute,

            exam_type:
              learningRoute === 'olevel'
                ? examType
                : null,
          },
          {
            onConflict: 'auth_user_id',
          }
        )

      if (profileError) {
        throw profileError
      }

      setMessage(
        'Profile saved successfully!'
      )

      // --------------------------------------------------------
      // 3. GO TO DASHBOARD
      // --------------------------------------------------------

      setTimeout(() => {
        navigate('/dashboard', {
          replace: true,
        })
      }, 700)

    } catch (error) {
      console.error(
        'SAVE PROFILE ERROR:',
        error
      )

      setMessage(
        error?.message ||
          'Unable to save your profile. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-spinner"></div>

        <p>
          Loading your profile...
        </p>
      </div>
    )
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="student-profile-page">

      <div className="profile-orb profile-orb-one"></div>
      <div className="profile-orb profile-orb-two"></div>

      <header className="profile-header">
        <img
          src={logo}
          alt="Overmaths"
        />
      </header>

      <main className="profile-main">

        {/* ==================================================
            INTRO
        ================================================== */}

        <section className="profile-intro">

          <p className="profile-eyebrow">
            YOUR OVERMATHS PROFILE
          </p>

          <h1>
            Let's personalize
            <br />
            your <span>learning.</span>
          </h1>

          <p>
            Tell us a little about yourself so
            Overmaths can give you the right
            questions, subjects and practice
            experience.
          </p>

        </section>

        {/* ==================================================
            PROGRESS
        ================================================== */}

        <div className="profile-progress">

          <div
            className={
              step >= 1
                ? 'progress-active'
                : ''
            }
          />

          <div
            className={
              step >= 2
                ? 'progress-active'
                : ''
            }
          />

          <div
            className={
              step >= 3
                ? 'progress-active'
                : ''
            }
          />

          <div
            className={
              step >= 4
                ? 'progress-active'
                : ''
            }
          />

        </div>

        <section className="profile-card">

          {/* ==================================================
              STEP 1
          ================================================== */}

          {step === 1 && (
            <div className="profile-step">

              <div className="step-heading">

                <div className="step-number">
                  01
                </div>

                <div>
                  <h2>
                    Tell us about yourself
                  </h2>

                  <p>
                    We'll use this information
                    to personalize your experience.
                  </p>
                </div>

              </div>

              <div className="profile-field">

                <label>
                  FULL NAME
                </label>

                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="profile-field">

                <label>
                  NICKNAME
                </label>

                <input
                  type="text"
                  placeholder="What should we call you?"
                  value={nickname}
                  onChange={(e) =>
                    setNickname(
                      e.target.value
                    )
                  }
                />

                <small>
                  This is the name Overmaths
                  can use when welcoming you.
                </small>

              </div>

              {message && (
                <p className="profile-message">
                  {message}
                </p>
              )}

              <div className="profile-actions">

                <button
                  type="button"
                  className="profile-primary-button"
                  onClick={nextStep}
                >
                  Continue
                  <span>→</span>
                </button>

              </div>

            </div>
          )}

          {/* ==================================================
              STEP 2
          ================================================== */}

          {step === 2 && (
            <div className="profile-step">

              <div className="step-heading">

                <div className="step-number">
                  02
                </div>

                <div>
                  <h2>
                    Choose your learning path
                  </h2>

                  <p>
                    This helps us show you
                    the right questions.
                  </p>
                </div>

              </div>

              <div className="route-section">

                <p className="route-label">
                  SELECT PATH
                </p>

                <div className="goal-grid">

                  <button
                    type="button"
                    className={`goal-card ${
                      learningRoute === 'olevel'
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() =>
                      setLearningRoute(
                        'olevel'
                      )
                    }
                  >

                    <div className="goal-icon">
                      O
                    </div>

                    <div>
                      <strong>
                        O-Level / Entrance
                      </strong>

                      <span>
                        JAMB, WAEC, NECO & NABTEB
                      </span>
                    </div>

                    {learningRoute ===
                      'olevel' && (
                      <div className="goal-check">
                        ✓
                      </div>
                    )}

                  </button>

                  <button
                    type="button"
                    className={`goal-card ${
                      learningRoute ===
                      'university'
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() =>
                      setLearningRoute(
                        'university'
                      )
                    }
                  >

                    <div className="goal-icon">
                      U
                    </div>

                    <div>
                      <strong>
                        University
                      </strong>

                      <span>
                        University courses
                        and subjects
                      </span>
                    </div>

                    {learningRoute ===
                      'university' && (
                      <div className="goal-check">
                        ✓
                      </div>
                    )}

                  </button>

                </div>

              </div>

              {message && (
                <p className="profile-message">
                  {message}
                </p>
              )}

              <div className="profile-actions">

                <button
                  type="button"
                  className="profile-back-button"
                  onClick={previousStep}
                >
                  Back
                </button>

                <button
                  type="button"
                  className="profile-primary-button"
                  onClick={nextStep}
                >
                  Continue
                  <span>→</span>
                </button>

              </div>

            </div>
          )}

          {/* ==================================================
              STEP 3
          ================================================== */}

          {step === 3 && (
            <div className="profile-step">

              <div className="step-heading">

                <div className="step-number">
                  03
                </div>

                <div>
                  <h2>
                    Tell us about your route
                  </h2>

                  <p>
                    Choose the examination that
                    matches your learning path.
                  </p>
                </div>

              </div>

              {learningRoute ===
                'olevel' && (
                <div className="profile-field">

                  <label>
                    EXAM TYPE
                  </label>

                  <select
                    value={examType}
                    onChange={(e) =>
                      setExamType(
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Select examination
                    </option>

                    <option value="JAMB / UTME">
                      JAMB / UTME
                    </option>

                    <option value="WAEC / SSCE">
                      WAEC / SSCE
                    </option>

                    <option value="NECO">
                      NECO
                    </option>

                    <option value="NABTEB">
                      NABTEB
                    </option>

                  </select>

                </div>
              )}

              {learningRoute ===
                'university' && (
                <div className="profile-university-info">

                  <div className="goal-icon">
                    U
                  </div>

                  <div>
                    <strong>
                      University Learning
                    </strong>

                    <p>
                      Your university course and
                      individual subjects can be
                      configured later from your
                      dashboard.
                    </p>
                  </div>

                </div>
              )}

              {message && (
                <p className="profile-message">
                  {message}
                </p>
              )}

              <div className="profile-actions">

                <button
                  type="button"
                  className="profile-back-button"
                  onClick={previousStep}
                >
                  Back
                </button>

                <button
                  type="button"
                  className="profile-primary-button"
                  onClick={nextStep}
                >
                  Review Profile
                  <span>→</span>
                </button>

              </div>

            </div>
          )}

          {/* ==================================================
              STEP 4
          ================================================== */}

          {step === 4 && (
            <div className="profile-step">

              <div className="step-heading">

                <div className="step-number">
                  04
                </div>

                <div>
                  <h2>
                    Your profile is ready
                  </h2>

                  <p>
                    Check your information
                    before entering Overmaths.
                  </p>
                </div>

              </div>

              <div className="profile-summary">

                <div className="summary-row">

                  <span>
                    Name
                  </span>

                  <strong>
                    {fullName}
                  </strong>

                </div>

                <div className="summary-row">

                  <span>
                    Nickname
                  </span>

                  <strong>
                    {nickname}
                  </strong>

                </div>

                <div className="summary-row">

                  <span>
                    Learning path
                  </span>

                  <strong>
                    {learningRoute ===
                    'olevel'
                      ? 'O-Level / Entrance'
                      : 'University'}
                  </strong>

                </div>

                {examType && (
                  <div className="summary-row">

                    <span>
                      Exam
                    </span>

                    <strong>
                      {examType}
                    </strong>

                  </div>
                )}

              </div>

              {message && (
                <p className="profile-success">
                  {message}
                </p>
              )}

              <div className="profile-actions">

                <button
                  type="button"
                  className="profile-back-button"
                  onClick={previousStep}
                  disabled={saving}
                >
                  Back
                </button>

                <button
                  type="button"
                  className="profile-primary-button"
                  onClick={saveProfile}
                  disabled={saving}
                >

                  {saving
                    ? 'Saving...'
                    : 'Enter Overmaths'}

                  {!saving && (
                    <span>→</span>
                  )}

                </button>

              </div>

            </div>
          )}

        </section>

      </main>

      <footer className="profile-footer">

        <span>
          Overmaths
        </span>

        <span>
          Smart Exam Practice
        </span>

      </footer>

    </div>
  )
}

export default StudentProfile