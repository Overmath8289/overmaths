
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './StudentProfile.css'

function StudentProfile() {
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [nickname, setNickname] = useState('')
  const [learningRoute, setLearningRoute] = useState('')
  const [examType, setExamType] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const savedNickname = user.user_metadata?.nickname

      if (savedNickname) {
        setNickname(savedNickname)
      }
    }

    loadProfile()
  }, [])

  const handleNext = () => {
    setMessage('')

    if (!nickname.trim()) {
      setMessage('Please tell us what you would like us to call you.')
      return
    }

    setStep(2)
  }

  const selectSecondaryExam = (exam) => {
    setLearningRoute('secondary')
    setExamType(exam)
  }

  const selectUniversity = () => {
    setLearningRoute('university')
    setExamType('University')
  }

  const handleSubmit = async () => {
    setMessage('')

    if (!learningRoute || !examType) {
      setMessage('Please select your examination route.')
      return
    }

    setLoading(true)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setMessage('Your session has expired. Please log in again.')
        setLoading(false)
        return
      }

      /*
       * First save the nickname in Supabase Auth metadata.
       * This does not require a new database column.
       */
      const { error: nicknameError } = await supabase.auth.updateUser({
        data: {
          nickname: nickname.trim(),
        },
      })

      if (nicknameError) {
        console.error(nicknameError)
        setMessage(nicknameError.message)
        setLoading(false)
        return
      }

      /*
       * Preserve the existing full_name in public.users.
       * We do not replace it with the nickname.
       */
      const { data: existingUser, error: existingUserError } =
        await supabase
          .from('users')
          .select('full_name')
          .eq('email', user.email)
          .maybeSingle()

      if (existingUserError) {
        console.error(existingUserError)
        setMessage(existingUserError.message)
        setLoading(false)
        return
      }

      const existingFullName =
        existingUser?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        'Student'

      /*
       * Keep the existing users table structure.
       * full_name remains in the database.
       * nickname stays in Auth metadata.
       */
      const { error } = await supabase
        .from('users')
        .upsert(
          {
            auth_user_id: user.id,
            email: user.email,
            full_name: existingFullName,
            learning_route: learningRoute,
            exam_type: examType,
          },
          {
            onConflict: 'email',
          }
        )

      if (error) {
        console.error(error)
        setMessage(error.message)
        setLoading(false)
        return
      }

      navigate('/dashboard')
    } catch (error) {
      console.error(error)
      setMessage('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="student-profile-page">

      <div className="profile-orb profile-orb-one"></div>
      <div className="profile-orb profile-orb-two"></div>

      <header className="profile-header">
        <img
          src="/src/assets/overmaths-logo.png"
          alt="Overmaths"
        />
      </header>

      <main className="profile-main">

        <div className="profile-intro">
          <p className="profile-eyebrow">
            SETUP 0{step} / 02
          </p>

          <h1>
            Let's personalize
            <span> your learning.</span>
          </h1>

          <p>
            Overmaths uses your learning route to create
            the right preparation experience for you.
          </p>
        </div>

        <div className="profile-progress">
          <div className={step >= 1 ? 'progress-active' : ''}></div>
          <div className={step >= 2 ? 'progress-active' : ''}></div>
        </div>

        <div className="profile-card">

          {step === 1 && (
            <div className="profile-step">

              <div className="step-heading">
                <span className="step-number">01</span>

                <div>
                  <h2>
                    What should we call you around here?

                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      style={{
                        marginLeft: '8px',
                        verticalAlign: 'middle',
                      }}
                    >
                      <path
                        d="M12 2.8l1.45 4.42a2 2 0 0 0 1.33 1.33L19.2 10l-4.42 1.45a2 2 0 0 0-1.33 1.33L12 17.2l-1.45-4.42a2 2 0 0 0-1.33-1.33L4.8 10l4.42-1.45a2 2 0 0 0 1.33-1.33L12 2.8Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      <path
                        d="M19 16.5l.55 1.68a1 1 0 0 0 .67.67L21.9 19.4l-1.68.55a1 1 0 0 0-.67.67L19 22.3l-.55-1.68a1 1 0 0 0-.67-.67l-1.68-.55 1.68-.55a1 1 0 0 0 .67-.67L19 16.5Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </h2>

                  <p>
                    Pick a name you like. This is how Overmaths
                    will address you throughout your learning journey.
                  </p>
                </div>
              </div>

              <div className="profile-field">
                <label>NICKNAME</label>

                <input
                  type="text"
                  placeholder="e.g. Mathlord, Ace, Scholar..."
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={30}
                />
              </div>

              {message && (
                <p className="profile-message">
                  {message}
                </p>
              )}

              <div className="profile-actions">
                <button
                  className="profile-primary-button"
                  onClick={handleNext}
                >
                  Continue

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

            </div>
          )}

          {step === 2 && (
            <div className="profile-step">

              <div className="step-heading">
                <span className="step-number">02</span>

                <div>
                  <h2>Choose your learning route</h2>

                  <p>
                    Your choice determines how Overmaths
                    organizes your subjects, courses and practice.
                  </p>
                </div>
              </div>

              <div className="route-section">

                <p className="route-label">
                  SECONDARY / O-LEVEL
                </p>

                <div className="goal-grid">

                  <button
                    type="button"
                    className={`goal-card ${
                      examType === 'UTME' ? 'selected' : ''
                    }`}
                    onClick={() => selectSecondaryExam('UTME')}
                  >
                    <div className="goal-icon">U</div>

                    <div>
                      <strong>UTME</strong>
                      <span>JAMB examination</span>
                    </div>

                    {examType === 'UTME' && (
                      <div className="goal-check">✓</div>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`goal-card ${
                      examType === 'WAEC' ? 'selected' : ''
                    }`}
                    onClick={() => selectSecondaryExam('WAEC')}
                  >
                    <div className="goal-icon">W</div>

                    <div>
                      <strong>WAEC</strong>
                      <span>West African examination</span>
                    </div>

                    {examType === 'WAEC' && (
                      <div className="goal-check">✓</div>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`goal-card ${
                      examType === 'NECO' ? 'selected' : ''
                    }`}
                    onClick={() => selectSecondaryExam('NECO')}
                  >
                    <div className="goal-icon">N</div>

                    <div>
                      <strong>NECO</strong>
                      <span>National examination</span>
                    </div>

                    {examType === 'NECO' && (
                      <div className="goal-check">✓</div>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`goal-card ${
                      examType === 'NABTEB' ? 'selected' : ''
                    }`}
                    onClick={() => selectSecondaryExam('NABTEB')}
                  >
                    <div className="goal-icon">N</div>

                    <div>
                      <strong>NABTEB</strong>
                      <span>Technical examination</span>
                    </div>

                    {examType === 'NABTEB' && (
                      <div className="goal-check">✓</div>
                    )}
                  </button>

                </div>

                <p className="route-label university-label">
                  UNIVERSITY
                </p>

                <button
                  type="button"
                  className={`goal-card university-card ${
                    examType === 'University' ? 'selected' : ''
                  }`}
                  onClick={selectUniversity}
                >
                  <div className="goal-icon">U</div>

                  <div>
                    <strong>University Courses</strong>
                    <span>
                      Learn by course and course code
                    </span>
                  </div>

                  {examType === 'University' && (
                    <div className="goal-check">✓</div>
                  )}
                </button>

              </div>

              {message && (
                <p className="profile-message">
                  {message}
                </p>
              )}

              <div className="profile-actions">

                <button
                  className="profile-back-button"
                  onClick={() => {
                    setMessage('')
                    setStep(1)
                  }}
                  disabled={loading}
                >
                  Back
                </button>

                <button
                  className="profile-primary-button"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Enter Overmaths'}

                  {!loading && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M5 12h14M13 6l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>

              </div>

            </div>
          )}

        </div>

      </main>

      <footer className="profile-footer">
        <span>© 2026 Overmaths</span>
        <span>Learn smarter. Prepare better.</span>
      </footer>

    </div>
  )
}

export default StudentProfile

