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

  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [subscription, setSubscription] = useState(null)

  // =========================================================
  // CHECK SUBSCRIPTION
  // =========================================================

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      try {
        // -----------------------------------------------------
        // AUTHENTICATION
        // -----------------------------------------------------

        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession()

        if (authError) {
          console.error('Authentication error:', authError)
        }

        if (!session?.user) {
          navigate('/login', { replace: true })
          return
        }

        const authUserId = session.user.id

        // -----------------------------------------------------
        // PROFILE
        // -----------------------------------------------------

        const { data: profileData, error: profileError } =
          await supabase
            .from('users')
            .select(
              'id, full_name, learning_route, exam_type'
            )
            .eq('auth_user_id', authUserId)
            .single()

        if (profileError || !profileData) {
          console.error(
            'Profile error:',
            profileError
          )

          return
        }

        if (!mounted) return

        setProfile(profileData)

        // =====================================================
        // PREMIUM SUBSCRIPTION CHECK
        // =====================================================

        let premiumUser = false
        let latestSubscription = null

        try {
          const {
            data: subscriptions,
            error: subscriptionError,
          } = await supabase
            .from('subscriptions')
            .select(
              `
              id,
              plan,
              started_at,
              expires_at,
              status,
              created_at
              `
            )
            .eq('user_id', profileData.id)
            .order('created_at', {
              ascending: false,
            })

          if (subscriptionError) {
            console.error(
              'Subscription lookup error:',
              subscriptionError
            )
          } else {
            // -------------------------------------------------
            // Find an actually active Premium subscription.
            //
            // Do NOT only inspect the newest subscription.
            // A user may have an old expired subscription and
            // a newer active Premium subscription.
            // -------------------------------------------------

            const now = new Date()

            const activePremiumSubscription =
              (subscriptions || []).find((item) => {
                const plan = String(
                  item?.plan || ''
                )
                  .trim()
                  .toLowerCase()

                const status = String(
                  item?.status || ''
                )
                  .trim()
                  .toLowerCase()

                const premiumPlan =
                  plan === 'premium' ||
                  plan === 'premium monthly' ||
                  plan === 'premium yearly' ||
                  plan === 'premium annual'

                if (!premiumPlan) {
                  return false
                }

                // ---------------------------------------------
                // Status must be active
                // ---------------------------------------------

                if (status !== 'active') {
                  return false
                }

                // ---------------------------------------------
                // Check start date if one exists
                // ---------------------------------------------

                if (item.started_at) {
                  const startedAt = new Date(
                    item.started_at
                  )

                  if (
                    !Number.isNaN(startedAt.getTime()) &&
                    startedAt > now
                  ) {
                    return false
                  }
                }

                // ---------------------------------------------
                // Check expiry date if one exists
                // ---------------------------------------------

                if (item.expires_at) {
                  const expiresAt = new Date(
                    item.expires_at
                  )

                  if (
                    !Number.isNaN(expiresAt.getTime()) &&
                    expiresAt <= now
                  ) {
                    return false
                  }
                }

                return true
              })

            if (activePremiumSubscription) {
              premiumUser = true
              latestSubscription =
                activePremiumSubscription
            } else {
              // Keep the newest subscription for display/debugging
              latestSubscription =
                subscriptions?.[0] || null
            }
          }
        } catch (subscriptionError) {
          console.error(
            'Premium verification error:',
            subscriptionError
          )
        }

        if (!mounted) return

        setSubscription(
          latestSubscription
        )

        setIsPremium(premiumUser)
        setSubscriptionLoading(false)

        console.log(
          'OVERMATHS PREMIUM ACCESS:',
          premiumUser
        )

        console.log(
          'OVERMATHS SUBSCRIPTION:',
          latestSubscription
        )

        // =====================================================
        // CRITICAL:
        // PREMIUM USERS MUST LEAVE /dashboard
        // =====================================================

        if (premiumUser) {
          navigate('/premium', {
            replace: true,
          })

          return
        }

        // =====================================================
        // FREE USER DASHBOARD STATISTICS
        // =====================================================

        try {
          const summary =
            await getDashboardSummary(
              authUserId
            )

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

  // =========================================================
  // LOADING
  // =========================================================

  if (loading || subscriptionLoading) {
    return (
      <div className="dashboard-page dashboard-loading">
        <div className="dashboard-loader">
          <div className="loader-orb"></div>

          <p>
            Preparing your learning space...
          </p>
        </div>
      </div>
    )
  }

  // =========================================================
  // SAFETY
  //
  // If Premium detection somehow changes while this component
  // is rendering, do not show the Free dashboard.
  // =========================================================

  if (isPremium) {
    return (
      <div className="dashboard-page dashboard-loading">
        <div className="dashboard-loader">
          <div className="loader-orb"></div>

          <p>
            Opening your Premium Command Center...
          </p>
        </div>
      </div>
    )
  }

  // =========================================================
  // PROFILE
  // =========================================================

  const fullName =
    profile?.full_name || 'Student'

  const firstName =
    fullName.trim().split(' ')[0] || 'Student'

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

  // =========================================================
  // DASHBOARD DATA
  // =========================================================

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

  // =========================================================
  // ACTIONS
  // =========================================================

  const handleStartPractice = () => {
    navigate('/practice')
  }

  const handlePremiumAction = () => {
    // Free users always go to the upgrade page.
    navigate('/premium-upgrade')
  }

  // =========================================================
  // RENDER
  // =========================================================

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
            onClick={() =>
              navigate('/dashboard')
            }
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() =>
              navigate('/practice')
            }
          >
            Practice
          </button>

          <button
            type="button"
            onClick={() =>
              navigate('/dashboard')
            }
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
            PREMIUM ADVERTISEMENT
        =================================================== */}

        <section className="premium-ad-card">

          <div className="premium-ad-glow glow-one"></div>
          <div className="premium-ad-glow glow-two"></div>

          <div className="premium-ad-content">

            <div className="premium-ad-badge">
              <span className="premium-star">
                ✦
              </span>

              OVERMATHS PREMIUM
            </div>

            <div className="premium-ad-slider">

              <div className="premium-ad-slide active">

                <small>
                  IMAGINE THIS
                </small>

                <h2>
                  Know exactly
                  <span>
                    {' '}what to study next.
                  </span>
                </h2>

                <p>
                  Premium turns your practice history
                  into a personalized preparation strategy.
                </p>

              </div>

              <div className="premium-ad-slide">

                <small>
                  SEE YOUR WEAKNESSES
                </small>

                <h2>
                  Stop guessing
                  <span>
                    {' '}where you're losing marks.
                  </span>
                </h2>

                <p>
                  Discover the topics that deserve
                  your attention before exam day.
                </p>

              </div>

              <div className="premium-ad-slide">

                <small>
                  PREPARE WITH PURPOSE
                </small>

                <h2>
                  Turn your exam date
                  <span>
                    {' '}into a strategy.
                  </span>
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
                        key={`${item.subject}-${item.topic}`}
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
                    key={`${item.subject}-${item.topic}`}
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
            PREMIUM BENEFITS
        =================================================== */}

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