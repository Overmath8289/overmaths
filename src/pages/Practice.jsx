import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from "../supabaseClient";
import './Practice.css' 

export default function Practice() {
  const location = useLocation()
  const navigate = useNavigate()

  const incomingState = location.state || {}

  const [profile, setProfile] = useState(null)
  const [courses, setCourses] = useState([])
  const [subjects, setSubjects] = useState([])

  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState('')

  const [topic, setTopic] = useState('mixed')
  const [topics, setTopics] = useState([])

  const [mode, setMode] = useState('practice')
  const [questionCount, setQuestionCount] = useState(10)
  const [timePerQuestion, setTimePerQuestion] = useState(30)

  const [loading, setLoading] = useState(true)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [error, setError] = useState('')

  const isUniversity = profile?.learning_route === 'university'

  /* =========================================================
     LOAD USER PROFILE
     ========================================================= */

  useEffect(() => {
    let mounted = true

    async function loadProfile() {
      setLoading(true)
      setError('')

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        navigate('/login', { replace: true })
        return
      }

      const { data, error: profileError } = await supabase
        .from('users')
        .select('full_name, learning_route, exam_type')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (!mounted) return

      if (profileError) {
        console.error(profileError)
        setError('Unable to load your learning profile.')
        setLoading(false)
        return
      }

      const nextProfile = data || {
        full_name: user.user_metadata?.full_name || 'Student',
        learning_route: 'secondary',
        exam_type: 'UTME',
      }

      setProfile(nextProfile)

      if (incomingState.learningRoute === 'university') {
        setProfile((current) => ({
          ...(current || nextProfile),
          learning_route: 'university',
        }))
      }

      if (incomingState.learningRoute === 'secondary') {
        setProfile((current) => ({
          ...(current || nextProfile),
          learning_route: 'secondary',
        }))
      }

      setLoading(false)
    }

    loadProfile()

    return () => {
      mounted = false
    }
  }, [navigate])

  /* =========================================================
     LOAD UNIVERSITY COURSES
     ========================================================= */

  useEffect(() => {
    if (!profile || !isUniversity) return

    let mounted = true

    async function loadCourses() {
      setError('')

      const { data, error: coursesError } = await supabase
        .from('courses')
        .select('id, name, code, description')
        .order('code', { ascending: true })

      if (!mounted) return

      if (coursesError) {
        console.error(coursesError)
        setError('Unable to load university courses.')
        return
      }

      const loadedCourses = data || []

      setCourses(loadedCourses)

      if (incomingState.courseId) {
        const incomingCourse = loadedCourses.find(
          (course) => String(course.id) === String(incomingState.courseId)
        )

        if (incomingCourse) {
          setSelectedCourse(incomingCourse)
          return
        }
      }

      if (loadedCourses.length > 0) {
        setSelectedCourse(loadedCourses[0])
      }
    }

    loadCourses()

    return () => {
      mounted = false
    }
  }, [profile, isUniversity])

  /* =========================================================
     LOAD SECONDARY SUBJECTS
     ========================================================= */

  useEffect(() => {
    if (!profile || isUniversity) return

    let mounted = true

    async function loadSubjects() {
      setError('')

      const { data, error: subjectsError } = await supabase
        .from('questions')
        .select('subject')
        .eq('is_active', true)
        .not('subject', 'is', null)

      if (!mounted) return

      if (subjectsError) {
        console.error(subjectsError)

        setSubjects([
          'Physics',
          'Mathematics',
          'English',
        ])

        if (incomingState.subject) {
          setSelectedSubject(incomingState.subject)
        } else {
          setSelectedSubject('Physics')
        }

        return
      }

      const uniqueSubjects = [
        ...new Set(
          (data || [])
            .map((item) => item.subject)
            .filter(Boolean)
        ),
      ].sort()

      const finalSubjects =
        uniqueSubjects.length > 0
          ? uniqueSubjects
          : ['Physics', 'Mathematics', 'English']

      setSubjects(finalSubjects)

      if (incomingState.subject) {
        const matchingSubject = finalSubjects.find(
          (subject) =>
            subject.toLowerCase() ===
            String(incomingState.subject).toLowerCase()
        )

        if (matchingSubject) {
          setSelectedSubject(matchingSubject)
          return
        }
      }

      if (finalSubjects.length > 0) {
        setSelectedSubject(finalSubjects[0])
      }
    }

    loadSubjects()

    return () => {
      mounted = false
    }
  }, [profile, isUniversity])

  /* =========================================================
     LOAD TOPICS
     ========================================================= */

  useEffect(() => {
    if (!profile) return

    if (isUniversity && !selectedCourse) {
      setTopics([])
      return
    }

    if (!isUniversity && !selectedSubject) {
      setTopics([])
      return
    }

    let mounted = true

    async function loadTopics() {
      setLoadingTopics(true)
      setError('')

      let query = supabase
        .from('questions')
        .select('topic')
        .eq('is_active', true)
        .not('topic', 'is', null)

      if (isUniversity) {
        query = query.eq('course_id', selectedCourse.id)
      } else {
        query = query
          .is('course_id', null)
          .eq('subject', selectedSubject)
      }

      const { data, error: topicError } = await query

      if (!mounted) return

      if (topicError) {
        console.error(topicError)
        setTopics([])
        setLoadingTopics(false)
        return
      }

      const uniqueTopics = [
        ...new Set(
          (data || [])
            .map((item) => item.topic)
            .filter(Boolean)
        ),
      ].sort()

      setTopics(uniqueTopics)
      setTopic('mixed')
      setLoadingTopics(false)
    }

    loadTopics()

    return () => {
      mounted = false
    }
  }, [profile, isUniversity, selectedCourse, selectedSubject])

  /* =========================================================
     START PRACTICE
     ========================================================= */

  function handleStart() {
    if (isUniversity && !selectedCourse) {
      setError('Please select a course first.')
      return
    }

    if (!isUniversity && !selectedSubject) {
      setError('Please select a subject first.')
      return
    }

    navigate('/quiz', {
      state: {
        subject: isUniversity ? '' : selectedSubject,

        courseId: isUniversity
          ? selectedCourse.id
          : null,

        courseCode: isUniversity
          ? selectedCourse.code
          : '',

        courseName: isUniversity
          ? selectedCourse.name
          : '',

        topic,

        questionCount,

        mode,

        timePerQuestion,

        learningRoute: isUniversity
          ? 'university'
          : 'secondary',

        examType:
          profile?.exam_type || 'UTME',
      },
    })
  }

  /* =========================================================
     NAVIGATION
     ========================================================= */

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  /* =========================================================
     HELPERS
     ========================================================= */

  function getCourseIcon(code = '') {
    const firstLetter = code.charAt(0).toUpperCase()

    const icons = {
      P: 'P',
      M: 'M',
      C: 'C',
      G: 'G',
      B: 'B',
      E: 'E',
    }

    return icons[firstLetter] || 'C'
  }

  function getSubjectIcon(subject = '') {
    const value = subject.toLowerCase()

    if (value.includes('physics')) return 'P'
    if (value.includes('math')) return 'M'
    if (value.includes('english')) return 'E'
    if (value.includes('chem')) return 'C'
    if (value.includes('bio')) return 'B'

    return subject.charAt(0).toUpperCase() || 'S'
  }

  function getSubjectIconClass(subject = '') {
    const value = subject.toLowerCase()

    if (value.includes('physics')) return 'physics-icon'
    if (value.includes('math')) return 'maths-icon'
    if (value.includes('english')) return 'english-icon'
    if (value.includes('chem')) return 'chemistry-icon'
    if (value.includes('bio')) return 'biology-icon'

    return ''
  }

  const selectedName = isUniversity
    ? selectedCourse?.name || 'Select a course'
    : selectedSubject || 'Select a subject'

  const selectedCode = isUniversity
    ? selectedCourse?.code || ''
    : selectedSubject || ''

  if (loading) {
    return (
      <div className="practice-page">
        <div className="practice-loading">
          <div className="practice-loader">
            <div className="loader-orb" />
          </div>

          <p>Preparing your learning space...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="practice-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="practice-header">
        <div className="practice-header-inner">

          <button
            type="button"
            className="practice-brand"
            onClick={() => navigate('/')}
            aria-label="Go to Overmaths home"
          >
            <img
              src="/src/assets/overmaths-logo.png"
              alt="Overmaths"
            />
          </button>

          <nav
            className="practice-nav"
            aria-label="Main navigation"
          >
            <button
              type="button"
              onClick={() => navigate('/')}
            >
              Home
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </button>

            <button
              type="button"
              className="practice-nav-active"
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

          <div className="practice-header-actions">

            <button
              type="button"
              className="practice-dashboard-button"
              onClick={() => navigate('/dashboard')}
            >
              <span>←</span>
              Dashboard
            </button>

            <button
              type="button"
              className="practice-logout"
              onClick={handleLogout}
            >
              Logout
            </button>

          </div>

        </div>
      </header>

      {/* =====================================================
          MAIN
          ===================================================== */}

      <main className="practice-main">

        {/* Decorative background */}
        <div className="practice-background-glow glow-one" />
        <div className="practice-background-glow glow-two" />

        {/* ===================================================
            INTRO
            =================================================== */}

        <section className="practice-intro">

          <div className="practice-intro-copy">

            <div className="practice-eyebrow">
              <span className="eyebrow-line" />
              BUILD YOUR SESSION
            </div>

            <h1>
              Practice with
              <span> purpose.</span>
            </h1>

            <p className="practice-subtitle">
              Build a focused learning session around what
              you want to master today.
            </p>

          </div>

          <div className="practice-status">
            <span className="status-dot" />
            <span>
              {isUniversity
                ? 'University Learning'
                : `${profile?.exam_type || 'UTME'} Preparation`}
            </span>
          </div>

        </section>

        {/* ===================================================
            ERROR
            =================================================== */}

        {error && (
          <div className="practice-error">
            <span className="error-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* ===================================================
            STEP 01
            =================================================== */}

        <section className="practice-section">

          <div className="practice-section-heading">

            <div className="practice-step">
              <span>01</span>
              <div>
                <strong>
                  {isUniversity
                    ? 'Choose your course'
                    : 'Choose your subject'}
                </strong>

                <small>
                  Start with the area you want to improve.
                </small>
              </div>
            </div>

            <div className="step-status">
              {selectedName}
            </div>

          </div>

          {isUniversity ? (

            courses.length > 0 ? (
              <div className="subject-grid">

                {courses.map((course) => (
                  <button
                    type="button"
                    key={course.id}
                    className={`subject-card ${
                      selectedCourse?.id === course.id
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedCourse(course)
                      setTopic('mixed')
                    }}
                  >

                    <div className="subject-icon">
                      {getCourseIcon(course.code)}
                    </div>

                    <div className="subject-card-content">
                      <strong>
                        {course.code}
                      </strong>

                      <small>
                        {course.name}
                      </small>
                    </div>

                    {selectedCourse?.id === course.id && (
                      <span className="selected-mark">
                        ✓
                      </span>
                    )}

                  </button>
                ))}

              </div>
            ) : (
              <div className="empty-practice-state">
                <strong>No courses available yet</strong>
                <span>
                  Add university courses to Supabase before
                  starting a university practice session.
                </span>
              </div>
            )

          ) : (

            subjects.length > 0 ? (
              <div className="subject-grid">

                {subjects.map((subject) => (
                  <button
                    type="button"
                    key={subject}
                    className={`subject-card ${
                      selectedSubject === subject
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedSubject(subject)
                      setTopic('mixed')
                    }}
                  >

                    <div
                      className={`subject-icon ${
                        getSubjectIconClass(subject)
                      }`}
                    >
                      {getSubjectIcon(subject)}
                    </div>

                    <div className="subject-card-content">
                      <strong>
                        {subject}
                      </strong>

                      <small>
                        {profile?.exam_type || 'Exam preparation'}
                      </small>
                    </div>

                    {selectedSubject === subject && (
                      <span className="selected-mark">
                        ✓
                      </span>
                    )}

                  </button>
                ))}

              </div>
            ) : (
              <div className="empty-practice-state">
                <strong>No subjects available</strong>
                <span>
                  Add active questions to your question bank
                  to populate this section.
                </span>
              </div>
            )

          )}

        </section>

        {/* ===================================================
            STEP 02
            =================================================== */}

        <section className="practice-section">

          <div className="practice-section-heading">

            <div className="practice-step">
              <span>02</span>

              <div>
                <strong>
                  Choose a topic
                </strong>

                <small>
                  Focus your practice or let Overmaths mix it.
                </small>
              </div>
            </div>

            <div className="step-status">
              {topic === 'mixed'
                ? 'Mixed topics'
                : topic}
            </div>

          </div>

          <div className="topic-wrapper">

            <button
              type="button"
              className={`topic-card topic-mixed ${
                topic === 'mixed' ? 'selected' : ''
              }`}
              onClick={() => setTopic('mixed')}
            >

              <div className="topic-main">
                <strong>Mixed topics</strong>
                <small>
                  Questions from across this subject.
                </small>
              </div>

              {topic === 'mixed' && (
                <span className="selected-mark">
                  ✓
                </span>
              )}

            </button>

            {loadingTopics ? (

              <div className="topics-loading">
                <span />
                Loading topics...
              </div>

            ) : topics.length > 0 ? (

              <div className="topic-list">

                {topics.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={`topic-pill ${
                      topic === item ? 'selected' : ''
                    }`}
                    onClick={() => setTopic(item)}
                  >
                    {item}
                  </button>
                ))}

              </div>

            ) : (

              <div className="topics-empty">
                No specific topics available yet. Mixed practice
                will use all available questions.
              </div>

            )}

          </div>

        </section>

        {/* ===================================================
            STEP 03
            =================================================== */}

        <section className="practice-section">

          <div className="practice-section-heading">

            <div className="practice-step">
              <span>03</span>

              <div>
                <strong>
                  Choose your mode
                </strong>

                <small>
                  Decide how Overmaths should respond to your answers.
                </small>
              </div>
            </div>

          </div>

          <div className="mode-grid">

            <button
              type="button"
              className={`mode-card ${
                mode === 'practice' ? 'selected' : ''
              }`}
              onClick={() => setMode('practice')}
            >

              <div className="mode-icon">
                ⚡
              </div>

              <span>
                <strong>Practice Mode</strong>

                <small>
                  Get instant feedback and explanations
                  after every answer.
                </small>
              </span>

              {mode === 'practice' && (
                <span className="selected-mark">
                  ✓
                </span>
              )}

            </button>

            <button
              type="button"
              className={`mode-card ${
                mode === 'quiz' ? 'selected' : ''
              }`}
              onClick={() => setMode('quiz')}
            >

              <div className="mode-icon">
                ◈
              </div>

              <span>
                <strong>Quiz Mode</strong>

                <small>
                  Simulate an exam and review your
                  performance afterwards.
                </small>
              </span>

              {mode === 'quiz' && (
                <span className="selected-mark">
                  ✓
                </span>
              )}

            </button>

          </div>

        </section>

        {/* ===================================================
            STEP 04
            =================================================== */}

        <section className="practice-section">

          <div className="practice-section-heading">

            <div className="practice-step">
              <span>04</span>

              <div>
                <strong>
                  Session size
                </strong>

                <small>
                  How many questions do you want to tackle?
                </small>
              </div>
            </div>

            <div className="step-status">
              {questionCount} questions
            </div>

          </div>

          <div className="question-count-grid">

            {[5, 10, 20, 30].map((count) => (
              <button
                type="button"
                key={count}
                className={`question-count-card ${
                  questionCount === count
                    ? 'selected'
                    : ''
                }`}
                onClick={() => setQuestionCount(count)}
              >
                <strong>{count}</strong>
                <span>Questions</span>

                {questionCount === count && (
                  <span className="selected-mark">
                    ✓
                  </span>
                )}
              </button>
            ))}

          </div>

        </section>

        {/* ===================================================
            STEP 05
            =================================================== */}

        <section className="practice-section">

          <div className="practice-section-heading">

            <div className="practice-step">
              <span>05</span>

              <div>
                <strong>
                  Speed challenge
                </strong>

                <small>
                  Set the maximum time available for each question.
                </small>
              </div>
            </div>

            <div className="step-status">
              {timePerQuestion}s / question
            </div>

          </div>

          <div className="time-grid">

            {[10, 20, 30, 45, 60].map((seconds) => (
              <button
                type="button"
                key={seconds}
                className={`time-card ${
                  timePerQuestion === seconds
                    ? 'selected'
                    : ''
                }`}
                onClick={() => setTimePerQuestion(seconds)}
              >

                <strong>{seconds}s</strong>

                <span>
                  {seconds === 60
                    ? 'Maximum'
                    : seconds <= 20
                      ? 'Fast'
                      : 'Balanced'}
                </span>

                {timePerQuestion === seconds && (
                  <span className="selected-mark">
                    ✓
                  </span>
                )}

              </button>
            ))}

          </div>

          <div className="speed-note">
            <span>i</span>
            <p>
              The timer resets for every question. If time
              runs out, the question is automatically marked
              unanswered and the session continues.
            </p>
          </div>

        </section>

        {/* ===================================================
            SESSION SUMMARY
            =================================================== */}

        <section className="practice-summary">

          <div className="summary-content">

            <div className="summary-kicker">
              YOUR SESSION
            </div>

            <h2>
              Ready to start?
            </h2>

            <p>
              Your session is configured. Focus on the questions,
              learn from every attempt, and keep moving forward.
            </p>

            <div className="summary-details">

              <div>
                <span>Subject</span>
                <strong>
                  {selectedCode}
                </strong>
              </div>

              <div>
                <span>Topic</span>
                <strong>
                  {topic === 'mixed'
                    ? 'Mixed'
                    : topic}
                </strong>
              </div>

              <div>
                <span>Mode</span>
                <strong>
                  {mode === 'practice'
                    ? 'Practice'
                    : 'Quiz'}
                </strong>
              </div>

              <div>
                <span>Questions</span>
                <strong>
                  {questionCount}
                </strong>
              </div>

            </div>

          </div>

          <button
            type="button"
            className="start-session-button"
            onClick={handleStart}
          >
            <span>Start Session</span>
            <strong>→</strong>
          </button>

        </section>

      </main>

      {/* =====================================================
          FOOTER
          ===================================================== */}

      <footer className="practice-footer">

        <div>
          <strong>OVERMATHS</strong>
          <span>
            Learn smarter. Practice better.
          </span>
        </div>

        <span>
          © {new Date().getFullYear()} Overmaths
        </span>

      </footer>

    </div>
  )
}