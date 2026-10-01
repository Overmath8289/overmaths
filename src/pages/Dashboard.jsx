import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getDashboardSummary } from '../dashboardApi'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const [dashboardData, setDashboardData] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)

  // ---------------------------------------------------------
  // SUBSCRIPTION STATE
  // ---------------------------------------------------------

  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [subscription, setSubscription] = useState(null)

  // ---------------------------------------------------------
  // LOAD DASHBOARD
  // ---------------------------------------------------------

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      try {
        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession()

        if (authError || !session?.user) {
          navigate('/login')
          return
        }

        const user = session.user

        // -----------------------------------------------------
        // PROFILE
        // -----------------------------------------------------

        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, learning_route, exam_type')
          .eq('auth_user_id', user.id)
          .single()

        if (error) {
          console.error('Profile error:', error)
          return
        }

        if (!mounted) return

        setProfile(data)

        // -----------------------------------------------------
        // DASHBOARD STATISTICS
        // -----------------------------------------------------

        try {
          const summary = await getDashboardSummary(user.id)

          if (mounted) {
            setDashboardData(summary)
          }
        } catch (dashboardError) {
          console.error(
            'Dashboard statistics error:',
            dashboardError
          )
        } finally {
          if (mounted) {
            setDashboardLoading(false)
          }
        }

        // -----------------------------------------------------
        // PREMIUM SUBSCRIPTION
        // -----------------------------------------------------

        try {
          const { data: latestSubscription, error: subscriptionError } =
            await supabase
              .from('subscriptions')
              .select(
                'id, plan, started_at, expires_at, status, created_at'
              )
              .eq('user_id', data.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

          if (subscriptionError) {
            console.error(
              'Subscription lookup error:',
              subscriptionError
            )

            if (mounted) {
              setIsPremium(false)
            }

            return
          }

          if (!latestSubscription) {
            if (mounted) {
              setSubscription(null)
              setIsPremium(false)
            }

            return
          }

          const plan = String(
            latestSubscription.plan || ''
          )
            .trim()
            .toLowerCase()

          const status = String(
            latestSubscription.status || ''
          )
            .trim()
            .toLowerCase()

          const now = new Date()

          const startedAt = new Date(
            latestSubscription.started_at
          )

          const expiresAt = new Date(
            latestSubscription.expires_at
          )

          const premiumPlan =
            plan === 'premium' ||
            plan === 'premium monthly' ||
            plan === 'premium yearly' ||
            plan === 'premium annual'

          const active =
            status === 'active'

          const started =
            startedAt <= now

          const notExpired =
            expiresAt > now

          const premiumAccess =
            premiumPlan &&
            active &&
            started &&
            notExpired

          console.log(
            'OVERMATHS PREMIUM:',
            premiumAccess
          )

          if (mounted) {
            setSubscription(latestSubscription)
            setIsPremium(premiumAccess)
          }
        } catch (subscriptionError) {
          console.error(
            'Premium verification error:',
            subscriptionError
          )

          if (mounted) {
            setIsPremium(false)
          }
        } finally {
          if (mounted) {
            setSubscriptionLoading(false)
          }
        }
      } catch (error) {
        console.error(
          'Dashboard error:',
          error
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [navigate])

  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // PROFILE
  // ---------------------------------------------------------

  const fullName =
    profile?.full_name || 'Student'

  const firstName =
    fullName.trim().split(' ')[0]

  const examType =
    profile?.exam_type || 'UTME'

  const learningRoute =
    profile?.learning_route || 'secondary'

  const isUniversity =
    learningRoute === 'university'

  const routeTitle =
    isUniversity
      ? 'UNIVERSITY LEARNING COMMAND CENTRE'
      : `${examType} PREPARATION COMMAND CENTRE`

  const routeDescription =
    isUniversity
      ? 'Build stronger understanding across your university courses.'
      : `Let's make today's ${examType} preparation count.`

  // ---------------------------------------------------------
  // DASHBOARD DATA
  // ---------------------------------------------------------

  const overview =
    dashboardData?.overview || {}

  const performance =
    dashboardData?.performance || {}

  const weaknesses =
    dashboardData?.weaknesses || []

  const strengths =
    dashboardData?.strengths || []

  const encouragement =
    dashboardData?.encouragement || null

  const questionsAnswered =
    overview.questions_answered || 0

  const accuracy =
    overview.accuracy || 0

  const studyStreak =
    overview.study_streak || 0

  const examReadiness =
    overview.exam_readiness || 0

  // ---------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------

  const handleStartPractice = () => {
    navigate('/practice')
  }

  const handlePremiumAction = () => {
    if (isPremium) {
      navigate('/premium')
    } else {
      navigate('/premium-upgrade')
    }
  }

  return (
    <div className="dashboard-page">

      {/* =====================================================
          TOP NAVIGATION
      ===================================================== */}

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
            onClick={() =>
              navigate('/student-profile')
            }
          >
            Profile
          </button>

        </nav>

        <button
          type="button"
          className="dashboard-profile"
          onClick={() =>
            navigate('/student-profile')
          }
        >
          <span className="profile-avatar">
            {firstName.charAt(0).toUpperCase()}
          </span>

          <span className="profile-name">
            {firstName}
          </span>

          <svg
            viewBox="0 0 24 24"
            fill="none"
          >
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

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="dashboard-main">

        {/* ===================================================
            WELCOME
        =================================================== */}

        <section className="dashboard-welcome">

          <div>

            <p className="dashboard-eyebrow">
              {isPremium
                ? 'OVERMATHS PREMIUM COMMAND CENTRE'
                : routeTitle}
            </p>

            <h1>
              Welcome back,
              <span> {firstName}.</span>
            </h1>

            <p className="dashboard-subtitle">
              {isPremium
                ? 'Your Premium preparation system is ready. Let’s make your next study session count.'
                : routeDescription}
            </p>

          </div>

          <div
            className={
              isPremium
                ? 'welcome-status premium-status'
                : 'welcome-status'
            }
          >
            <span className="status-dot"></span>

            {subscriptionLoading
              ? 'Checking account...'
              : isPremium
                ? 'Premium Active'
                : 'Ready to learn'}
          </div>

        </section>

        {/* ===================================================
            COACH
        =================================================== */}

        {encouragement &&
          !dashboardLoading && (
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

        {/* ===================================================
            PREMIUM EXPERIENCE
        =================================================== */}

        {isPremium ? (

          <section className="premium-command-center">

            <div className="premium-command-glow"></div>

            <div className="premium-command-content">

              <div className="premium-command-label">
                <span className="premium-pulse"></span>
                OVERMATHS PREMIUM
              </div>

              <h2>
                Your preparation,
                <span> intelligently planned.</span>
              </h2>

              <p>
                Your Premium tools are unlocked.
                Plan your exam, understand your
                performance and focus on what matters most.
              </p>

              <div className="premium-feature-strip">

                <span>Exam Planner</span>
                <span>Smart Analytics</span>
                <span>Personal Missions</span>
                <span>Overmaths Coach</span>

              </div>

              <button
                type="button"
                className="premium-button premium-open-button"
                onClick={handlePremiumAction}
              >
                Open Premium Command Center

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

            <div className="premium-command-preview">

              <div className="premium-preview-window">

                <div className="preview-top">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

                <div className="preview-countdown">
                  <small>EXAM COUNTDOWN</small>
                  <strong>247</strong>
                  <span>DAYS</span>
                </div>

                <div className="preview-bars">
                  <span style={{ width: '78%' }}></span>
                  <span style={{ width: '61%' }}></span>
                  <span style={{ width: '86%' }}></span>
                </div>

              </div>

            </div>

          </section>

        ) : (

          /* =================================================
             FREE USER PREMIUM ADVERTISEMENT
          ================================================= */

          <section className="premium-ad-card">

            <div className="premium-ad-glow glow-one"></div>
            <div className="premium-ad-glow glow-two"></div>

            <div className="premium-ad-content">

              <div className="premium-ad-badge">
                <span className="premium-star">✦</span>
                OVERMATHS PREMIUM
              </div>

              <div className="premium-ad-slider">

                <div className="premium-ad-slide active">
                  <small>IMAGINE THIS</small>

                  <h2>
                    Know exactly
                    <span> what to study next.</span>
                  </h2>

                  <p>
                    Premium turns your practice history
                    into a personalized preparation strategy.
                  </p>
                </div>

                <div className="premium-ad-slide">
                  <small>SEE YOUR WEAKNESSES</small>

                  <h2>
                    Stop guessing
                    <span> where you're losing marks.</span>
                  </h2>

                  <p>
                    Discover the topics that deserve
                    your attention before exam day.
                  </p>
                </div>

                <div className="premium-ad-slide">
                  <small>PREPARE WITH PURPOSE</small>

                  <h2>
                    Turn your exam date
                    <span> into a strategy.</span>
                  </h2>

                  <p>
                    Build focused preparation around
                    the time you actually have.
                  </p>
                </div>

              </div>

              <div className="premium-ad-features">

                <div>
                  <strong>◷</strong>
                  <span>Exam Planner</span>
                </div>

                <div>
                  <strong>◈</strong>
                  <span>Smart Analytics</span>
                </div>

                <div>
                  <strong>⚡</strong>
                  <span>Daily Missions</span>
                </div>

                <div>
                  <strong>✦</strong>
                  <span>AI Coaching</span>
                </div>

              </div>

              <button
                type="button"
                className="premium-ad-button"
                onClick={handlePremiumAction}
              >
                Unlock Premium

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

              <span className="premium-ad-note">
                Unlock the full Overmaths preparation experience.
              </span>

            </div>

            <div className="premium-ad-visual">

              <div className="ad-orbit orbit-a"></div>
              <div className="ad-orbit orbit-b"></div>

              <div className="ad-core">

                <span>✦</span>

                <strong>
                  PREMIUM
                </strong>

                <small>
                  YOUR ADVANTAGE
                </small>

              </div>

            </div>

          </section>
        )}

        {/* ===================================================
            TODAY'S MISSION
        =================================================== */}

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

                <span>
                  THINK FIRST
                </span>

                <strong>
                  Understand before you answer.
                </strong>

                <p>
                  The fastest way to improve is to
                  understand why an answer is correct.
                </p>

              </div>

            </div>

            <div className="mission-card">

              <div className="mission-icon maths-icon">
                ↑
              </div>

              <div className="mission-info">

                <span>
                  BUILD YOUR EDGE
                </span>

                <strong>
                  Turn mistakes into progress.
                </strong>

                <p>
                  Every mistake reveals something
                  your next practice session can improve.
                </p>

              </div>

            </div>

            <div className="mission-card">

              <div className="mission-icon english-icon">
                ✓
              </div>

              <div className="mission-info">

                <span>
                  EXAM MINDSET
                </span>

                <strong>
                  Accuracy first. Speed follows.
                </strong>

                <p>
                  Train your understanding now so
                  pressure feels easier when the real exam arrives.
                </p>

              </div>

            </div>

          </div>

          <div className="dashboard-action-center">

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

        {/* ===================================================
            STATISTICS
        =================================================== */}

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

        {/* ===================================================
            PERFORMANCE + WEAK AREAS
        =================================================== */}

        <section className="dashboard-lower-grid">

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
                onClick={() =>
                  navigate('/dashboard')
                }
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

        {/* ===================================================
            STRONG AREAS
        =================================================== */}

        {!dashboardLoading &&
          strengths.length > 0 && (
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

        {/* ===================================================
            PREMIUM BENEFITS FOR FREE USERS
        =================================================== */}

        {!isPremium && (
          <section className="premium-benefit-section">

            <div className="section-heading">

              <div>

                <p className="section-kicker">
                  GO BEYOND PRACTICE
                </p>

                <h2>
                  What Premium unlocks
                </h2>

              </div>

            </div>

            <div className="premium-benefit-grid">

              <div className="premium-benefit-card">
                <span>◷</span>
                <strong>Exam Planner</strong>
                <p>
                  Build preparation around your
                  actual exam date.
                </p>
              </div>

              <div className="premium-benefit-card">
                <span>◈</span>
                <strong>Smart Analytics</strong>
                <p>
                  Understand your performance
                  beyond a simple score.
                </p>
              </div>

              <div className="premium-benefit-card">
                <span>⚡</span>
                <strong>Personal Missions</strong>
                <p>
                  Know what deserves your attention
                  each day.
                </p>
              </div>

              <div className="premium-benefit-card">
                <span>✦</span>
                <strong>Overmaths Coach</strong>
                <p>
                  Get intelligent guidance based
                  on your preparation.
                </p>
              </div>

            </div>

          </section>
        )}

        {/* ===================================================
            NEXT MOVE
        =================================================== */}

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

      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

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