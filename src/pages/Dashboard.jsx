
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getDashboardSummary } from './dashboard/dashboardApi'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const [dashboardData, setDashboardData] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          navigate('/login')
          return
        }

        const { data, error } = await supabase
          .from('users')
          .select('full_name, learning_route, exam_type')
          .eq('auth_user_id', user.id)
          .single()

        if (error) {
          console.error('Profile error:', error)
          return
        }

        setProfile(data)

        try {
          const summary = await getDashboardSummary(user.id)
          setDashboardData(summary)
        } catch (dashboardError) {
          console.error(
            'Dashboard statistics error:',
            dashboardError
          )
        } finally {
          setDashboardLoading(false)
        }
      } catch (error) {
        console.error('Dashboard error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [navigate])

  if (loading) {
    return (
      <div className="dashboard-page dashboard-loading">
        <div className="dashboard-loader">
          <div className="loader-orb"></div>
          <p>Preparing your learning space...</p>
        </div>
      </div>
    )
  }

  const fullName = profile?.full_name || 'Student'

  const firstName = fullName
    .trim()
    .split(' ')[0]

  const examType = profile?.exam_type || 'UTME'
  const learningRoute = profile?.learning_route || 'secondary'

  const isUniversity = learningRoute === 'university'

  const routeTitle = isUniversity
    ? 'UNIVERSITY LEARNING COMMAND CENTRE'
    : `${examType} PREPARATION COMMAND CENTRE`

  const routeDescription = isUniversity
    ? 'Build stronger understanding across your university courses.'
    : `Let's make today's ${examType} preparation count.`

  /*
    DASHBOARD DATA
  */

  const overview = dashboardData?.overview || {}
  const performance = dashboardData?.performance || {}
  const weaknesses = dashboardData?.weaknesses || []
  const strengths = dashboardData?.strengths || []
  const encouragement = dashboardData?.encouragement || null

  const questionsAnswered =
    overview.questions_answered || 0

  const accuracy =
    overview.accuracy || 0

  const studyStreak =
    overview.study_streak || 0

  const examReadiness =
    overview.exam_readiness || 0

  const handleStartPractice = () => {
    navigate('/practice')
  }

  return (
    <div className="dashboard-page">

      {/* TOP NAVIGATION */}
      <header className="dashboard-header">

        <div className="dashboard-brand">
          <img
            src="/src/assets/overmaths-logo.png"
            alt="Overmaths"
          />
        </div>

        <nav className="dashboard-nav">

          <button
            type="button"
            className="active"
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() => navigate('/practice')}
          >
            Practice
          </button>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
          >
            Progress
          </button>

          <button
            type="button"
            onClick={() => navigate('/student-profile')}
          >
            Profile
          </button>

        </nav>

        <button
          type="button"
          className="dashboard-profile"
          onClick={() => navigate('/student-profile')}
        >
          <span className="profile-avatar">
            {firstName.charAt(0).toUpperCase()}
          </span>

          <span className="profile-name">
            {firstName}
          </span>

          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

      </header>

      {/* MAIN CONTENT */}
      <main className="dashboard-main">

        {/* WELCOME */}
        <section className="dashboard-welcome">

          <div>

            <p className="dashboard-eyebrow">
              {routeTitle}
            </p>

            <h1>
              Welcome back,
              <span> {firstName}.</span>
            </h1>

            <p className="dashboard-subtitle">
              {routeDescription}
            </p>

          </div>

          <div className="welcome-status">
            <span className="status-dot"></span>
            Ready to learn
          </div>

        </section>

        {/* ENCOURAGEMENT */}
        {encouragement && !dashboardLoading && (
          <section className="dashboard-section">

            <div className="mission-card">

              <div className="mission-icon maths-icon">
                ↑
              </div>

              <div className="mission-info">

                <span>
                  OVERMATHS COACH
                </span>

                <strong>
                  {encouragement.title}
                </strong>

                <p>
                  {encouragement.message}
                </p>

              </div>

            </div>

          </section>
        )}

        {/* EXAM / PREMIUM CARD */}
        <section className="exam-card">

          <div className="exam-glow"></div>

          <div className="exam-content">

            <div className="exam-label">

              <span className="lock-icon">

                <svg viewBox="0 0 24 24" fill="none">

                  <rect
                    x="5"
                    y="10"
                    width="14"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />

                  <path
                    d="M8 10V7a4 4 0 018 0v3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />

                </svg>

              </span>

              PREMIUM EXAM PLANNER

            </div>

            <h2>
              Prepare around your actual exam date.
            </h2>

            <p>
              Set your exam date and let Overmaths turn the
              time you have left into a focused preparation plan.
            </p>

            <button
              type="button"
              className="premium-button"
            >
              Unlock Exam Planner

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

          <div className="exam-preview">

            <span>EXAM COUNTDOWN</span>

            <strong>--</strong>

            <small>days remaining</small>

            <div className="preview-line"></div>

            <p>Premium feature</p>

          </div>

        </section>

        {/* TODAY'S MISSION */}
        <section className="dashboard-section">

          <div className="section-heading">

            <div>

              <p className="section-kicker">
                FOCUS FOR TODAY
              </p>

              <h2>
                Today's Mission
              </h2>

            </div>

            <span className="mission-count">
              READY WHEN YOU ARE
            </span>

          </div>

          <div className="mission-grid">

            <div className="mission-card">

              <div className="mission-icon physics-icon">
                ?
              </div>

              <div className="mission-info">

                <span>THINK FIRST</span>

                <strong>
                  Understand before you answer.
                </strong>

                <p>
                  The fastest way to improve is to understand
                  why an answer is correct.
                </p>

              </div>

            </div>

            <div className="mission-card">

              <div className="mission-icon maths-icon">
                ↑
              </div>

              <div className="mission-info">

                <span>BUILD YOUR EDGE</span>

                <strong>
                  Turn mistakes into progress.
                </strong>

                <p>
                  Every mistake reveals something your next
                  practice session can improve.
                </p>

              </div>

            </div>

            <div className="mission-card">

              <div className="mission-icon english-icon">
                ✓
              </div>

              <div className="mission-info">

                <span>EXAM MINDSET</span>

                <strong>
                  Accuracy first. Speed follows.
                </strong>

                <p>
                  Train your understanding now so pressure
                  feels easier when the real exam arrives.
                </p>

              </div>

            </div>

          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '18px',
            }}
          >
            <button
              type="button"
              className="premium-button"
              onClick={handleStartPractice}
            >
              Start Practicing

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

        </section>

        {/* STATISTICS */}
        <section className="stats-grid">

          <div className="stat-card">

            <span className="stat-label">
              QUESTIONS ANSWERED
            </span>

            <strong>
              {dashboardLoading
                ? '—'
                : questionsAnswered}
            </strong>

            <p>
              {questionsAnswered > 0
                ? 'Questions completed so far'
                : 'Start your first mission'}
            </p>

          </div>

          <div className="stat-card">

            <span className="stat-label">
              ACCURACY
            </span>

            <strong>
              {dashboardLoading
                ? '—'
                : `${accuracy}%`}
            </strong>

            <p>
              Your average performance
            </p>

          </div>

          <div className="stat-card">

            <span className="stat-label">
              STUDY STREAK
            </span>

            <strong>
              {dashboardLoading
                ? '—'
                : studyStreak}

              {!dashboardLoading && (
                <small> days</small>
              )}
            </strong>

            <p>
              Build your consistency
            </p>

          </div>

          <div className="stat-card">

            <span className="stat-label">
              EXAM READINESS
            </span>

            <strong>
              {dashboardLoading
                ? '—'
                : `${examReadiness}%`}
            </strong>

            <p>
              Based on your practice
            </p>

          </div>

        </section>

        {/* LOWER GRID */}
        <section className="dashboard-lower-grid">

          {/* PERFORMANCE */}
          <div className="dashboard-panel performance-panel">

            <div className="panel-heading">

              <div>

                <p className="section-kicker">
                  YOUR JOURNEY
                </p>

                <h2>
                  Performance
                </h2>

              </div>

              <button
                type="button"
                className="panel-link"
                onClick={() => navigate('/dashboard')}
              >
                View details
              </button>

            </div>

            <div className="chart-placeholder">

              <div className="chart-empty">

                <div className="chart-circle">

                  <span>
                    {dashboardLoading
                      ? '—'
                      : `${accuracy}%`}
                  </span>

                </div>

                <strong>

                  {dashboardLoading
                    ? 'Loading your performance...'
                    : accuracy > 0
                      ? 'Your performance is being tracked.'
                      : 'Your progress starts here.'}

                </strong>

                <p>

                  {dashboardLoading
                    ? 'Preparing your learning statistics.'
                    : performance.trend > 0
                      ? `You're improving. Your latest score is ${performance.trend}% higher than your previous attempt.`
                      : performance.trend < 0
                        ? `Your latest score dropped by ${Math.abs(performance.trend)}%. Use your weak areas as your next study guide.`
                        : 'Complete more practice sessions to reveal your performance trend.'}

                </p>

              </div>

            </div>

          </div>

          {/* WEAK AREAS */}
          <div className="dashboard-panel">

            <div className="panel-heading">

              <div>

                <p className="section-kicker">
                  SMART INSIGHT
                </p>

                <h2>
                  Areas to Improve
                </h2>

              </div>

            </div>

            <div className="empty-insight">

              <div className="insight-icon">

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M12 3v18M3 12h18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>

              </div>

              {dashboardLoading ? (
                <>
                  <strong>
                    Analysing your performance...
                  </strong>

                  <p>
                    Overmaths is looking for the topics
                    that need your attention.
                  </p>
                </>
              ) : weaknesses.length === 0 ? (
                <>
                  <strong>
                    No major weak areas yet.
                  </strong>

                  <p>
                    Keep practising. Overmaths will identify
                    topics that need attention as more answers
                    are recorded.
                  </p>
                </>
              ) : (
                <>
                  <strong>
                    Here's where you can improve.
                  </strong>

                  <div
                    style={{
                      width: '100%',
                      marginTop: '12px',
                    }}
                  >

                    {weaknesses.map((item) => (
                      <div
                        key={item.topic}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 0',
                          borderBottom:
                            '1px solid rgba(255,255,255,0.08)',
                        }}
                      >

                        <span>
                          {item.topic}
                        </span>

                        <strong>
                          {item.accuracy}%
                        </strong>

                      </div>
                    ))}

                  </div>
                </>
              )}

            </div>

          </div>

        </section>

        {/* STRONG AREAS */}
        {!dashboardLoading && strengths.length > 0 && (
          <section className="dashboard-section">

            <div className="section-heading">

              <div>

                <p className="section-kicker">
                  YOUR ADVANTAGE
                </p>

                <h2>
                  Strong Areas
                </h2>

              </div>

            </div>

            <div className="mission-grid">

              {strengths.map((item) => (
                <div
                  className="mission-card"
                  key={item.topic}
                >

                  <div className="mission-icon english-icon">
                    ✓
                  </div>

                  <div className="mission-info">

                    <span>
                      {item.accuracy}% ACCURACY
                    </span>

                    <strong>
                      {item.topic}
                    </strong>

                    <p>
                      You're showing strong performance
                      in this area. Keep it sharp.
                    </p>

                  </div>

                </div>
              ))}

            </div>

          </section>
        )}

        {/* KEEP MOVING */}
        <section className="dashboard-section">

          <div className="section-heading">

            <div>

              <p className="section-kicker">
                KEEP MOVING
              </p>

              <h2>
                Your Next Move
              </h2>

            </div>

          </div>

          <div className="practice-grid">

            <button
              type="button"
              className="practice-card"
              onClick={handleStartPractice}
            >

              <span>
                PRACTICE SMARTER
              </span>

              <strong>
                Build a session around what you need.
              </strong>

              <svg
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>

            </button>

            <button
              type="button"
              className="practice-card"
              onClick={handleStartPractice}
            >

              <span>
                CHALLENGE YOURSELF
              </span>

              <strong>
                Don't practise only what you already know.
              </strong>

              <svg
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>

            </button>

            <button
              type="button"
              className="practice-card"
              onClick={handleStartPractice}
            >

              <span>
                READY FOR MORE?
              </span>

              <strong>
                Choose your subject, topic and challenge.
              </strong>

              <svg
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>

            </button>

          </div>

        </section>

        {/* PREMIUM TEASER */}
        <section className="premium-banner">

          <div>

            <span className="premium-tag">
              OVERMATHS PREMIUM
            </span>

            <h2>
              Your preparation should be
              <span> personal.</span>
            </h2>

            <p>
              Unlock deeper analytics, personalized study plans,
              exam planning and intelligent coaching.
            </p>

          </div>

          <button type="button">

            Explore Premium

            <svg
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>

          </button>

        </section>

      </main>

      {/* FOOTER */}
      <footer className="dashboard-footer">

        <span>
          © 2026 Overmaths
        </span>

        <span>
          Learn smarter. Prepare better.
        </span>

      </footer>

    </div>
  )
}

export default Dashboard

