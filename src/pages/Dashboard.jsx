import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [coursesLoading, setCoursesLoading] = useState(false)

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

        /*
          If the student is on the university route,
          load the real courses from Supabase.
        */
        if (data?.learning_route === 'university') {
          setCoursesLoading(true)

          const {
            data: courseData,
            error: courseError,
          } = await supabase
            .from('courses')
            .select('id, name, code, description')
            .order('code', { ascending: true })

          if (courseError) {
            console.error('Courses error:', courseError)
          } else {
            setCourses(courseData || [])
          }

          setCoursesLoading(false)
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
    Secondary / O-Level subjects.

    University courses are NOT hard-coded here.
    They come directly from the Supabase courses table.
  */
  const secondarySubjects = [
    {
      name: 'PHYSICS',
      title: '15 Questions',
      description: 'Build your accuracy',
      icon: 'P',
      iconClass: 'physics-icon',
    },
    {
      name: 'MATHEMATICS',
      title: '15 Questions',
      description: 'Strengthen your skills',
      icon: 'M',
      iconClass: 'maths-icon',
    },
    {
      name: 'ENGLISH',
      title: '10 Questions',
      description: 'Improve your confidence',
      icon: 'E',
      iconClass: 'english-icon',
    },
  ]

  const subjects = isUniversity
    ? courses.map((course) => ({
        id: course.id,
        name: course.code || course.name,
        title: course.name,
        description:
          course.description ||
          'Strengthen your understanding',
        icon: getCourseIcon(course.code),
        iconClass: getCourseIconClass(course.code),
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
      }))
    : secondarySubjects

  const handleStartPractice = (subject) => {
    if (isUniversity) {
      navigate('/practice', {
        state: {
          learningRoute: 'university',
          courseId: subject.courseId,
          courseCode: subject.courseCode,
          courseName: subject.courseName,
        },
      })

      return
    }

    navigate('/practice', {
      state: {
        learningRoute: 'secondary',
        subject: subject.name,
        examType,
      },
    })
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
          >
            Progress
          </button>

          <button
            type="button"
          >
            Profile
          </button>
        </nav>

        <button
          type="button"
          className="dashboard-profile"
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
              0 / 3 completed
            </span>

          </div>

          <div className="mission-grid">

            {coursesLoading ? (

              <div className="mission-card">
                <div className="mission-info">
                  <strong>
                    Loading your courses...
                  </strong>

                  <p>
                    Preparing your learning space.
                  </p>
                </div>
              </div>

            ) : subjects.length > 0 ? (

              subjects.map((subject) => (

                <div
                  className="mission-card"
                  key={
                    isUniversity
                      ? subject.courseId
                      : subject.name
                  }
                >

                  <div
                    className={`mission-icon ${subject.iconClass}`}
                  >
                    {subject.icon}
                  </div>

                  <div className="mission-info">

                    <span>
                      {subject.name}
                    </span>

                    <strong>
                      {subject.title}
                    </strong>

                    <p>
                      {subject.description}
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleStartPractice(subject)
                    }
                  >
                    Start

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

              ))

            ) : (

              <div className="mission-card">

                <div className="mission-info">

                  <strong>
                    No courses available yet.
                  </strong>

                  <p>
                    Your university courses will appear
                    here when they are added.
                  </p>

                </div>

              </div>

            )}

          </div>

        </section>

        {/* STATISTICS */}
        <section className="stats-grid">

          <div className="stat-card">
            <span className="stat-label">
              QUESTIONS ANSWERED
            </span>

            <strong>0</strong>

            <p>
              Start your first mission
            </p>
          </div>

          <div className="stat-card">

            <span className="stat-label">
              ACCURACY
            </span>

            <strong>—</strong>

            <p>
              Your average performance
            </p>

          </div>

          <div className="stat-card">

            <span className="stat-label">
              STUDY STREAK
            </span>

            <strong>
              0 <small>days</small>
            </strong>

            <p>
              Build your consistency
            </p>

          </div>

          <div className="stat-card">

            <span className="stat-label">
              EXAM READINESS
            </span>

            <strong>—</strong>

            <p>
              Complete more practice
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
              >
                View details
              </button>

            </div>

            <div className="chart-placeholder">

              <div className="chart-empty">

                <div className="chart-circle">
                  <span>0%</span>
                </div>

                <strong>
                  Your progress starts here.
                </strong>

                <p>
                  Complete your first practice session
                  to begin tracking your performance.
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

              <strong>
                Your weak areas will appear here.
              </strong>

              <p>
                Once you complete enough questions,
                Overmaths will identify the topics
                that need your attention.
              </p>

            </div>

          </div>

        </section>

        {/* CONTINUE PRACTICE */}
        <section className="dashboard-section">

          <div className="section-heading">

            <div>

              <p className="section-kicker">
                KEEP MOVING
              </p>

              <h2>
                Continue Practicing
              </h2>

            </div>

          </div>

          <div className="practice-grid">

            {subjects.length > 0 ? (

              subjects.map((subject) => (

                <button
                  type="button"
                  className="practice-card"
                  key={
                    isUniversity
                      ? `practice-${subject.courseId}`
                      : `practice-${subject.name}`
                  }
                  onClick={() =>
                    handleStartPractice(subject)
                  }
                >

                  <span>
                    {subject.name}
                  </span>

                  <strong>
                    Start Practice
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

              ))

            ) : (

              <div className="practice-card">

                <span>
                  COURSES
                </span>

                <strong>
                  No courses available
                </strong>

              </div>

            )}

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
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
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


/*
  Give university courses a simple visual identity
  based on their course code.

  This does NOT affect the database.
*/

function getCourseIcon(code = '') {
  const normalized = code.toUpperCase()

  if (normalized.startsWith('PHY')) {
    return 'P'
  }

  if (
    normalized.startsWith('MAT') ||
    normalized.startsWith('MTH')
  ) {
    return 'M'
  }

  if (normalized.startsWith('CHM')) {
    return 'C'
  }

  if (normalized.startsWith('CSC')) {
    return 'C'
  }

  if (normalized.startsWith('GST')) {
    return 'G'
  }

  return 'C'
}


function getCourseIconClass(code = '') {
  const normalized = code.toUpperCase()

  if (normalized.startsWith('PHY')) {
    return 'physics-icon'
  }

  if (
    normalized.startsWith('MAT') ||
    normalized.startsWith('MTH')
  ) {
    return 'maths-icon'
  }

  if (normalized.startsWith('CHM')) {
    return 'chemistry-icon'
  }

  if (normalized.startsWith('CSC')) {
    return 'computer-icon'
  }

  if (normalized.startsWith('GST')) {
    return 'english-icon'
  }

  return 'maths-icon'
}


export default Dashboard