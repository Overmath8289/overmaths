import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './StudentProfile.css'

function StudentProfile() {
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState('')
  const [learningRoute, setLearningRoute] = useState('')
  const [examType, setExamType] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleNext = () => {
    setMessage('')

    if (!fullName.trim()) {
      setMessage('Please enter your full name.')
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

      const { error } = await supabase
        .from('users')
        .upsert(
          {
            auth_user_id: user.id,
            email: user.email,
            full_name: fullName.trim(),
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
                  <h2>Tell us your name</h2>
                  <p>
                    This is how Overmaths will address you
                    throughout your learning journey.
                  </p>
                </div>
              </div>

              <div className="profile-field">
                <label>FULL NAME</label>

                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
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