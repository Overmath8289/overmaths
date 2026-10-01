import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import logo from './assets/overmaths-logo.png'
import './Profile.css'

function Profile() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [step, setStep] = useState(1)

  const [fullName, setFullName] = useState('')
  const [path, setPath] = useState('')
  const [examType, setExamType] = useState('')
  const [subject, setSubject] = useState('')
  const [course, setCourse] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      if (!supabase) {
        setLoading(false)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        navigate('/login')
        return
      }

      setUser(user)

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (data) {
        setFullName(data.full_name || '')
        setPath(data.path || '')
        setExamType(data.exam_type || '')
        setSubject(data.subject || '')
        setCourse(data.course || '')
      }
    } catch (error) {
      console.error(error)
      setMessage('Unable to load your profile.')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    setMessage('')

    if (step === 1 && !fullName.trim()) {
      setMessage('Please enter your full name.')
      return
    }

    if (step === 2 && !path) {
      setMessage('Please select your learning path.')
      return
    }

    if (step === 3) {
      if (path === 'olevel' && !subject) {
        setMessage('Please select your subject.')
        return
      }

      if (path === 'university' && !course) {
        setMessage('Please enter your course.')
        return
      }
    }

    setStep((current) => Math.min(current + 1, 4))
  }

  const previousStep = () => {
    setMessage('')
    setStep((current) => Math.max(current - 1, 1))
  }

  const saveProfile = async () => {
    setMessage('')

    if (!supabase || !user) {
      setMessage('Supabase is not connected.')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          full_name: fullName.trim(),
          path,
          exam_type: examType || null,
          subject: subject || null,
          course: course || null,
        })

      if (error) throw error

      setMessage('Profile saved successfully.')

      setTimeout(() => {
        navigate('/')
      }, 700)
    } catch (error) {
      console.error(error)
      setMessage(
        error?.message ||
          'Unable to save your profile. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-spinner"></div>
        <p>Loading your profile...</p>
      </div>
    )
  }

  return (
    <div className="student-profile-page">

      <div className="profile-orb profile-orb-one"></div>
      <div className="profile-orb profile-orb-two"></div>

      <header className="profile-header">
        <img src={logo} alt="Overmaths" />
      </header>

      <main className="profile-main">

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
            Tell us a little about yourself so Overmaths can
            give you the right questions, subjects and practice
            experience.
          </p>

        </section>

        <div className="profile-progress">
          <div className={step >= 1 ? 'progress-active' : ''}></div>
          <div className={step >= 2 ? 'progress-active' : ''}></div>
          <div className={step >= 3 ? 'progress-active' : ''}></div>
          <div className={step >= 4 ? 'progress-active' : ''}></div>
        </div>

        <section className="profile-card">

          {/* STEP 1 */}

          {step === 1 && (
            <div className="profile-step">

              <div className="step-heading">

                <div className="step-number">
                  01
                </div>

                <div>
                  <h2>What should we call you?</h2>

                  <p>
                    Your name will be used to personalize
                    your Overmaths experience.
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
                    setFullName(e.target.value)
                  }
                />

              </div>

              <div className="profile-actions">

                <button
                  className="profile-primary-button"
                  onClick={nextStep}
                >
                  Continue
                  <span>→</span>
                </button>

              </div>

            </div>
          )}

          {/* STEP 2 */}

          {step === 2 && (
            <div className="profile-step">

              <div className="step-heading">

                <div className="step-number">
                  02
                </div>

                <div>
                  <h2>Choose your learning path</h2>

                  <p>
                    This helps us show you the questions
                    that match your academic level.
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
                      path === 'olevel'
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => setPath('olevel')}
                  >

                    <div className="goal-icon">
                      O
                    </div>

                    <div>
                      <strong>O-Level / Entrance</strong>
                      <span>
                        JAMB, WAEC, NECO & NABTEB
                      </span>
                    </div>

                    {path === 'olevel' && (
                      <div className="goal-check">
                        ✓
                      </div>
                    )}

                  </button>

                  <button
                    type="button"
                    className={`goal-card ${
                      path === 'university'
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() =>
                      setPath('university')
                    }
                  >

                    <div className="goal-icon">
                      U
                    </div>

                    <div>
                      <strong>University</strong>
                      <span>
                        Courses & university subjects
                      </span>
                    </div>

                    {path === 'university' && (
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
                  className="profile-back-button"
                  onClick={previousStep}
                >
                  Back
                </button>

                <button
                  className="profile-primary-button"
                  onClick={nextStep}
                >
                  Continue
                  <span>→</span>
                </button>

              </div>

            </div>
          )}

          {/* STEP 3 */}

          {step === 3 && (
            <div className="profile-step">

              <div className="step-heading">

                <div className="step-number">
                  03
                </div>

                <div>
                  <h2>Tell us what you're studying</h2>

                  <p>
                    We'll use this to personalize your
                    practice questions.
                  </p>
                </div>

              </div>

              {path === 'olevel' && (
                <>

                  <div className="profile-field">

                    <label>
                      EXAM TYPE
                    </label>

                    <select
                      value={examType}
                      onChange={(e) =>
                        setExamType(e.target.value)
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

                  <div className="profile-field">

                    <label>
                      SUBJECT
                    </label>

                    <input
                      type="text"
                      placeholder="e.g. Mathematics"
                      value={subject}
                      onChange={(e) =>
                        setSubject(e.target.value)
                      }
                    />

                  </div>

                </>
              )}

              {path === 'university' && (
                <>

                  <div className="profile-field">

                    <label>
                      UNIVERSITY COURSE
                    </label>

                    <input
                      type="text"
                      placeholder="e.g. Physics Electronics"
                      value={course}
                      onChange={(e) =>
                        setCourse(e.target.value)
                      }
                    />

                  </div>

                  <div className="profile-field">

                    <label>
                      SUBJECT / AREA
                    </label>

                    <input
                      type="text"
                      placeholder="e.g. Physics"
                      value={subject}
                      onChange={(e) =>
                        setSubject(e.target.value)
                      }
                    />

                  </div>

                </>
              )}

              {message && (
                <p className="profile-message">
                  {message}
                </p>
              )}

              <div className="profile-actions">

                <button
                  className="profile-back-button"
                  onClick={previousStep}
                >
                  Back
                </button>

                <button
                  className="profile-primary-button"
                  onClick={nextStep}
                >
                  Review Profile
                  <span>→</span>
                </button>

              </div>

            </div>
          )}

          {/* STEP 4 */}

          {step === 4 && (
            <div className="profile-step">

              <div className="step-heading">

                <div className="step-number">
                  04
                </div>

                <div>
                  <h2>Your profile is ready</h2>

                  <p>
                    Check your information before entering
                    your Overmaths dashboard.
                  </p>
                </div>

              </div>

              <div className="profile-summary">

                <div className="summary-row">
                  <span>Name</span>
                  <strong>{fullName}</strong>
                </div>

                <div className="summary-row">
                  <span>Learning path</span>
                  <strong>
                    {path === 'olevel'
                      ? 'O-Level / Entrance'
                      : 'University'}
                  </strong>
                </div>

                {examType && (
                  <div className="summary-row">
                    <span>Exam</span>
                    <strong>{examType}</strong>
                  </div>
                )}

                {subject && (
                  <div className="summary-row">
                    <span>Subject</span>
                    <strong>{subject}</strong>
                  </div>
                )}

                {course && (
                  <div className="summary-row">
                    <span>Course</span>
                    <strong>{course}</strong>
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
                  className="profile-back-button"
                  onClick={previousStep}
                  disabled={saving}
                >
                  Back
                </button>

                <button
                  className="profile-primary-button"
                  onClick={saveProfile}
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : 'Enter Overmaths'}

                  {!saving && <span>→</span>}
                </button>

              </div>

            </div>
          )}

        </section>

      </main>

      <footer className="profile-footer">
        <span>Overmaths</span>
        <span>Smart Exam Practice</span>
      </footer>

    </div>
  )
}

export default Profile