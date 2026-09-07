import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './StudentProfile.css'

function StudentProfile() {
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState('')
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const goals = [
    {
      id: 'JAMB',
      title: 'JAMB / UTME',
      subtitle: 'Prepare smarter for UTME',
      icon: 'target',
    },
    {
      id: 'WAEC',
      title: 'WAEC',
      subtitle: 'Master your secondary exams',
      icon: 'book',
    },
    {
      id: 'NECO',
      title: 'NECO',
      subtitle: 'Build confidence for NECO',
      icon: 'award',
    },
    {
      id: 'NABTEB',
      title: 'NABTEB',
      subtitle: 'Prepare for technical exams',
      icon: 'tools',
    },
    {
      id: 'University',
      title: 'University',
      subtitle: 'Excel in your university courses',
      icon: 'graduation',
    },
  ]

  const handleNext = () => {
    setMessage('')

    if (!fullName.trim()) {
      setMessage('Please enter your name to continue.')
      return
    }

    setStep(2)
  }

  const handleSubmit = async () => {
    setMessage('')

    if (!goal) {
      setMessage('Choose your learning goal to continue.')
      return
    }

    if (!supabase) {
      setMessage(
        'Profile setup is available on the live Overmaths website.'
      )
      return
    }

    setLoading(true)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setMessage(
          'Your session has expired. Please sign in again.'
        )
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('users')
        .upsert(
          {
            id: user.id,
            email: user.email,
            full_name: fullName.trim(),
          },
          {
            onConflict: 'id',
          }
        )

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      navigate('/dashboard')
    } catch (error) {
      setMessage(
        error?.message ||
          'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="profile-page">

      {/* Background decoration */}
      <div className="profile-orb profile-orb-one"></div>
      <div className="profile-orb profile-orb-two"></div>

      {/* Navigation */}
      <header className="profile-header">
        <div className="profile-brand">
          <img
            src="/src/assets/overmaths-logo.png"
            alt="Overmaths"
          />
        </div>

        <div className="profile-step">
          <span>SETUP</span>
          <strong>0{step}</strong>
          <span>/ 02</span>
        </div>
      </header>

      {/* Main */}
      <main className="profile-main">

        {/* Progress */}
        <div className="profile-progress">
          <div
            className="profile-progress-fill"
            style={{
              width: step === 1 ? '50%' : '100%',
            }}
          ></div>
        </div>

        {step === 1 && (
          <section className="profile-content">

            <div className="profile-eyebrow">
              <span className="eyebrow-line"></span>
              YOUR JOURNEY STARTS HERE
              <span className="eyebrow-line"></span>
            </div>

            <h1>
              Let's build your
              <span> learning path.</span>
            </h1>

            <p className="profile-description">
              Overmaths is more than answering questions.
              We learn how you study, where you struggle,
              and where you're trying to go.
            </p>

            <div className="profile-form-card">

              <div className="form-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>

              <div className="form-copy">
                <label>What should we call you?</label>
                <span>
                  Your name will personalize your Overmaths
                  experience.
                </span>
              </div>

              <input
                type="text"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                placeholder="Enter your full name"
                disabled={loading}
                autoComplete="name"
              />

            </div>

            {message && (
              <div className="profile-message">
                <span>!</span>
                {message}
              </div>
            )}

            <button
              className="profile-primary-button"
              onClick={handleNext}
              disabled={loading}
            >
              <span>Continue</span>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </button>

          </section>
        )}

        {step === 2 && (
          <section className="profile-content profile-goal-content">

            <div className="profile-eyebrow">
              <span className="eyebrow-line"></span>
              YOUR ACADEMIC GOAL
              <span className="eyebrow-line"></span>
            </div>

            <h1>
              Where are you
              <span> heading?</span>
            </h1>

            <p className="profile-description">
              Choose your main goal. We'll use it to
              personalize the questions, recommendations
              and progress you see.
            </p>

            <div className="goal-grid">

              {goals.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`goal-card ${
                    goal === item.id ? 'active' : ''
                  }`}
                  onClick={() => {
                    setGoal(item.id)
                    setMessage('')
                  }}
                  disabled={loading}
                >

                  <div className="goal-icon">

                    {item.icon === 'target' && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <circle cx="12" cy="12" r="5" />
                        <circle cx="12" cy="12" r="1.5" />
                      </svg>
                    )}

                    {item.icon === 'book' && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z" />
                        <path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20" />
                      </svg>
                    )}

                    {item.icon === 'award' && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <circle cx="12" cy="8" r="5" />
                        <path d="m8.5 12.5-1 8 4.5-2.5 4.5 2.5-1-8" />
                      </svg>
                    )}

                    {item.icon === 'tools' && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="m14.7 6.3 3-3a4 4 0 0 0 0 5.7l-8.4 8.4a2.1 2.1 0 1 1-3-3l8.4-8.4a4 4 0 0 0 5.7 0" />
                        <path d="m5 19 2 2" />
                      </svg>
                    )}

                    {item.icon === 'graduation' && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="m3 9 9-5 9 5-9 5z" />
                        <path d="M7 11.2V16c2.7 2.5 7.3 2.5 10 0v-4.8" />
                        <path d="M21 9v7" />
                      </svg>
                    )}

                  </div>

                  <div className="goal-text">
                    <strong>{item.title}</strong>
                    <span>{item.subtitle}</span>
                  </div>

                  <div className="goal-check">
                    {goal === item.id && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="m5 12 4 4L19 6" />
                      </svg>
                    )}
                  </div>

                </button>
              ))}

            </div>

            {message && (
              <div className="profile-message">
                <span>!</span>
                {message}
              </div>
            )}

            <div className="profile-actions">

              <button
                className="back-button"
                onClick={() => {
                  setStep(1)
                  setMessage('')
                }}
                disabled={loading}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M19 12H5" />
                  <path d="m11 18-6-6 6-6" />
                </svg>

                Back
              </button>

              <button
                className="profile-primary-button"
                onClick={handleSubmit}
                disabled={loading || !goal}
              >
                <span>
                  {loading
                    ? 'Creating your space...'
                    : 'Enter Overmaths'}
                </span>

                {!loading && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                )}
              </button>

            </div>

          </section>
        )}

      </main>

      <footer className="profile-footer">
        <span>OVERMATHS</span>
        <div></div>
        <span>SMART EXAM PRACTICE</span>
      </footer>

    </div>
  )
}

export default StudentProfile