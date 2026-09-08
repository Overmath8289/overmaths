import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './Practice.css'

function Practice() {
  const location = useLocation()
  const navigate = useNavigate()

  const incomingState = location.state || {}

  const [profile, setProfile] = useState(null)

  const [courses, setCourses] = useState([])
  const [subjects, setSubjects] = useState([])

  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(
    incomingState.subject || ''
  )

  const [topic, setTopic] = useState('mixed')
  const [topics, setTopics] = useState([])

  const [mode, setMode] = useState('practice')
  const [questionCount, setQuestionCount] = useState(20)
  const [timePerQuestion, setTimePerQuestion] = useState(30)

  const [loading, setLoading] = useState(true)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [error, setError] = useState('')

  const isUniversity =
    profile?.learning_route === 'university'

  /*
    -------------------------------------------------------
    LOAD USER PROFILE
    -------------------------------------------------------
  */

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          navigate('/login')
          return
        }

        const { data, error: profileError } = await supabase
          .from('users')
          .select(
            'full_name, learning_route, exam_type'
          )
          .eq('auth_user_id', user.id)
          .single()

        if (profileError) {
          console.error(
            'Practice profile error:',
            profileError
          )

          setError(
            'Unable to load your learning profile.'
          )

          return
        }

        setProfile(data)

        /*
          If Dashboard sent a course,
          keep that course selected.
        */
        if (
          data?.learning_route === 'university' &&
          incomingState.courseId
        ) {
          setSelectedCourse({
            id: incomingState.courseId,
            code: incomingState.courseCode || '',
            name: incomingState.courseName || '',
          })
        }

        /*
          If Dashboard sent a secondary subject,
          keep it selected.
        */
        if (
          data?.learning_route !== 'university' &&
          incomingState.subject
        ) {
          setSelectedSubject(
            incomingState.subject
          )
        }
      } catch (error) {
        console.error(
          'Practice profile error:',
          error
        )

        setError(
          'Unable to load your learning profile.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [navigate])


  /*
    -------------------------------------------------------
    LOAD UNIVERSITY COURSES
    -------------------------------------------------------
  */

  useEffect(() => {
    if (!profile || !isUniversity) {
      return
    }

    const loadCourses = async () => {
      try {
        const {
          data,
          error,
        } = await supabase
          .from('courses')
          .select(
            'id, name, code, description'
          )
          .order('code', {
            ascending: true,
          })

        if (error) {
          console.error(
            'Courses error:',
            error
          )

          setError(
            'Unable to load your university courses.'
          )

          return
        }

        const courseList = data || []

        setCourses(courseList)

        /*
          If a course came from Dashboard,
          match it against the real database record.
        */
        if (incomingState.courseId) {
          const matchingCourse =
            courseList.find(
              (course) =>
                String(course.id) ===
                String(incomingState.courseId)
            )

          if (matchingCourse) {
            setSelectedCourse(
              matchingCourse
            )
          }
        }
      } catch (error) {
        console.error(
          'Course loading error:',
          error
        )

        setError(
          'Unable to load university courses.'
        )
      }
    }

    loadCourses()
  }, [profile, isUniversity, incomingState.courseId])


  /*
    -------------------------------------------------------
    LOAD SECONDARY SUBJECTS
    -------------------------------------------------------

    Subjects come from the existing questions table.

    This means when new subjects are added to the
    question bank, the Practice page can discover them.
  */

  useEffect(() => {
    if (!profile || isUniversity) {
      return
    }

    const loadSubjects = async () => {
      try {
        const {
          data,
          error,
        } = await supabase
          .from('questions')
          .select('subject')
          .eq('is_active', true)
          .not('subject', 'is', null)

        if (error) {
          console.error(
            'Subjects error:',
            error
          )

          /*
            Keep the existing common subjects as
            a safe fallback.
          */
          setSubjects([
            'Physics',
            'Mathematics',
            'English',
          ])

          return
        }

        const uniqueSubjects = [
          ...new Set(
            (data || [])
              .map((item) =>
                item.subject?.trim()
              )
              .filter(Boolean)
          ),
        ].sort()

        setSubjects(uniqueSubjects)

        /*
          If Dashboard supplied a subject,
          preserve it.
        */
        if (incomingState.subject) {
          setSelectedSubject(
            incomingState.subject
          )
        } else if (
          uniqueSubjects.length > 0
        ) {
          setSelectedSubject(
            uniqueSubjects[0]
          )
        }
      } catch (error) {
        console.error(
          'Subject loading error:',
          error
        )

        setSubjects([
          'Physics',
          'Mathematics',
          'English',
        ])
      }
    }

    loadSubjects()
  }, [profile, isUniversity, incomingState.subject])


  /*
    -------------------------------------------------------
    LOAD TOPICS
    -------------------------------------------------------
  */

  useEffect(() => {
    if (!profile) {
      return
    }

    if (
      isUniversity &&
      !selectedCourse?.id
    ) {
      setTopics([])
      setTopic('mixed')
      return
    }

    if (
      !isUniversity &&
      !selectedSubject
    ) {
      setTopics([])
      setTopic('mixed')
      return
    }

    const loadTopics = async () => {
      setLoadingTopics(true)
      setError('')

      try {
        let query = supabase
          .from('questions')
          .select('topic')
          .eq('is_active', true)

        if (isUniversity) {
          query = query.eq(
            'course_id',
            selectedCourse.id
          )
        } else {
          query = query.eq(
            'subject',
            selectedSubject
          )
        }

        const {
          data,
          error,
        } = await query

        if (error) {
          console.error(
            'Topics error:',
            error
          )

          setTopics([])
          return
        }

        const uniqueTopics = [
          ...new Set(
            (data || [])
              .map((item) =>
                item.topic?.trim()
              )
              .filter(Boolean)
          ),
        ].sort()

        setTopics(uniqueTopics)

        /*
          Every new subject/course starts with
          Mixed Topics.
        */
        setTopic('mixed')
      } catch (error) {
        console.error(
          'Topic loading error:',
          error
        )

        setTopics([])
      } finally {
        setLoadingTopics(false)
      }
    }

    loadTopics()
  }, [
    profile,
    isUniversity,
    selectedCourse,
    selectedSubject,
  ])


  /*
    -------------------------------------------------------
    START SESSION
    -------------------------------------------------------
  */

  const handleStart = () => {
    setError('')

    if (isUniversity) {
      if (!selectedCourse?.id) {
        setError(
          'Please select a course before continuing.'
        )

        return
      }
    } else {
      if (!selectedSubject) {
        setError(
          'Please select a subject before continuing.'
        )

        return
      }
    }

    navigate('/quiz', {
      state: {
        subject: isUniversity
          ? ''
          : selectedSubject,

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

        learningRoute:
          isUniversity
            ? 'university'
            : 'secondary',

        examType:
          profile?.exam_type || 'UTME',
      },
    })
  }


  /*
    -------------------------------------------------------
    LOADING
    -------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="practice-page practice-loading">

        <div className="practice-loader">

          <div className="loader-orb"></div>

          <p>
            Preparing your practice space...
          </p>

        </div>

      </div>
    )
  }


  /*
    -------------------------------------------------------
    DISPLAY INFORMATION
    -------------------------------------------------------
  */

  const selectedTitle = isUniversity
    ? selectedCourse?.code ||
      selectedCourse?.name ||
      'Select a course'
    : selectedSubject ||
      'Select a subject'

  const selectedDescription =
    isUniversity
      ? selectedCourse?.name ||
        'Choose the course you want to study.'
      : `Prepare for ${
          profile?.exam_type || 'UTME'
        } with focused practice.`


  /*
    -------------------------------------------------------
    MAIN UI
    -------------------------------------------------------
  */

  return (
    <div className="practice-page">

      {/* HEADER */}

      <header className="practice-header">

        <div className="practice-brand">

          <img
            src="/src/assets/overmaths-logo.png"
            alt="Overmaths"
          />

        </div>

        <button
          type="button"
          className="practice-back"
          onClick={() =>
            navigate('/dashboard')
          }
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M19 12H5M11 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          Dashboard

        </button>

      </header>


      {/* MAIN */}

      <main className="practice-main">

        {/* INTRO */}

        <section className="practice-intro">

          <div>

            <p className="practice-eyebrow">
              {isUniversity
                ? 'UNIVERSITY LEARNING'
                : `${
                    profile?.exam_type ||
                    'UTME'
                  } PREPARATION`}
            </p>

            <h1>
              Build your next
              <span> learning session.</span>
            </h1>

            <p className="practice-subtitle">
              Choose what you want to work on,
              how you want to practise, and how
              fast you want the challenge to move.
            </p>

          </div>

          <div className="practice-status">

            <span className="status-dot"></span>

            Session ready

          </div>

        </section>


        {/* ERROR */}

        {error && (

          <div className="practice-error">

            <svg
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.8"
              />

              <path
                d="M12 8v5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <circle
                cx="12"
                cy="16"
                r="1"
                fill="currentColor"
              />
            </svg>

            <span>{error}</span>

          </div>

        )}


        {/* STEP 01 */}

        <section className="practice-section">

          <div className="practice-section-heading">

            <div className="practice-step">
              01
            </div>

            <div>

              <p>
                {isUniversity
                  ? 'CHOOSE COURSE'
                  : 'CHOOSE SUBJECT'}
              </p>

              <h2>
                {isUniversity
                  ? 'What course are you studying?'
                  : 'What do you want to practise?'}
              </h2>

            </div>

          </div>


          {/* UNIVERSITY COURSES */}

          {isUniversity ? (

            <div className="subject-grid">

              {courses.length > 0 ? (

                courses.map((course) => {

                  const active =
                    String(
                      selectedCourse?.id
                    ) ===
                    String(course.id)

                  return (

                    <button
                      type="button"
                      key={course.id}
                      className={`subject-card ${
                        active
                          ? 'selected'
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedCourse(
                          course
                        )
                        setTopic('mixed')
                      }}
                    >

                      <span className="subject-icon">
                        {getCourseIcon(
                          course.code
                        )}
                      </span>

                      <span className="subject-card-content">

                        <strong>
                          {course.code}
                        </strong>

                        <small>
                          {course.name}
                        </small>

                      </span>

                      {active && (

                        <span className="selected-mark">

                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M5 12l4 4L19 6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>

                        </span>

                      )}

                    </button>

                  )
                })

              ) : (

                <div className="empty-practice-state">

                  <strong>
                    No courses found.
                  </strong>

                  <p>
                    Add courses to your
                    Supabase courses table
                    and they will appear here.
                  </p>

                </div>

              )}

            </div>

          ) : (

            /* SECONDARY SUBJECTS */

            <div className="subject-grid">

              {subjects.map((item) => {

                const active =
                  item.toLowerCase() ===
                  selectedSubject.toLowerCase()

                return (

                  <button
                    type="button"
                    key={item}
                    className={`subject-card ${
                      active
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedSubject(
                        item
                      )

                      setTopic('mixed')
                    }}
                  >

                    <span
                      className={`subject-icon ${getSubjectIconClass(
                        item
                      )}`}
                    >
                      {getSubjectIcon(item)}
                    </span>

                    <span className="subject-card-content">

                      <strong>
                        {item}
                      </strong>

                      <small>
                        {profile?.exam_type ||
                          'UTME'}
                      </small>

                    </span>

                    {active && (

                      <span className="selected-mark">

                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M5 12l4 4L19 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>

                      </span>

                    )}

                  </button>

                )
              })}

            </div>

          )}

        </section>


        {/* STEP 02 */}

        <section className="practice-section">

          <div className="practice-section-heading">

            <div className="practice-step">
              02
            </div>

            <div>

              <p>
                CHOOSE TOPIC
              </p>

              <h2>
                How focused should this session be?
              </h2>

            </div>

          </div>


          <div className="topic-wrapper">

            <button
              type="button"
              className={`topic-card ${
                topic === 'mixed'
                  ? 'selected'
                  : ''
              }`}
              onClick={() =>
                setTopic('mixed')
              }
            >

              <span className="topic-main">

                <strong>
                  Mixed Topics
                </strong>

                <small>
                  Let Overmaths mix questions
                  across available topics.
                </small>

              </span>

              {topic === 'mixed' && (

                <span className="selected-mark">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 12l4 4L19 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                </span>

              )}

            </button>


            {loadingTopics ? (

              <div className="topics-loading">
                Loading available topics...
              </div>

            ) : topics.length > 0 ? (

              <div className="topic-list">

                {topics.map((item) => {

                  const active =
                    topic === item

                  return (

                    <button
                      type="button"
                      key={item}
                      className={`topic-pill ${
                        active
                          ? 'selected'
                          : ''
                      }`}
                      onClick={() =>
                        setTopic(item)
                      }
                    >
                      {item}

                      {active && (

                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M5 12l4 4L19 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>

                      )}

                    </button>

                  )
                })}

              </div>

            ) : (

              <div className="topics-empty">

                No topics available for this
                selection yet.

              </div>

            )}

          </div>

        </section>


        {/* STEP 03 */}

        <section className="practice-section">

          <div className="practice-section-heading">

            <div className="practice-step">
              03
            </div>

            <div>

              <p>
                CHOOSE MODE
              </p>

              <h2>
                How do you want to train?
              </h2>

            </div>

          </div>


          <div className="mode-grid">

            {/* PRACTICE */}

            <button
              type="button"
              className={`mode-card ${
                mode === 'practice'
                  ? 'selected'
                  : ''
              }`}
              onClick={() =>
                setMode('practice')
              }
            >

              <span className="mode-icon">

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

              </span>

              <span>

                <strong>
                  Practice Mode
                </strong>

                <small>
                  Learn as you go. Get immediate
                  feedback and explanations after
                  answering.
                </small>

              </span>

              {mode === 'practice' && (
                <span className="selected-mark">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 12l4 4L19 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}

            </button>


            {/* QUIZ */}

            <button
              type="button"
              className={`mode-card ${
                mode === 'quiz'
                  ? 'selected'
                  : ''
              }`}
              onClick={() =>
                setMode('quiz')
              }
            >

              <span className="mode-icon">

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <rect
                    x="4"
                    y="4"
                    width="16"
                    height="16"
                    rx="3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />

                  <path
                    d="M8 12h8M8 8h5M8 16h6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>

              </span>

              <span>

                <strong>
                  Quiz Mode
                </strong>

                <small>
                  Simulate an exam. See your
                  answers, score and explanations
                  after submission.
                </small>

              </span>

              {mode === 'quiz' && (
                <span className="selected-mark">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 12l4 4L19 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}

            </button>

          </div>

        </section>


        {/* STEP 04 */}

        <section className="practice-section">

          <div className="practice-section-heading">

            <div className="practice-step">
              04
            </div>

            <div>

              <p>
                SESSION SIZE
              </p>

              <h2>
                How many questions?
              </h2>

            </div>

          </div>


          <div className="question-count-grid">

            {[10, 20, 30, 40, 50].map(
              (count) => (

                <button
                  type="button"
                  key={count}
                  className={`question-count-card ${
                    questionCount === count
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() =>
                    setQuestionCount(count)
                  }
                >

                  <strong>
                    {count}
                  </strong>

                  <span>
                    Questions
                  </span>

                  {questionCount === count && (
                    <span className="selected-mark">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M5 12l4 4L19 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}

                </button>

              )
            )}

          </div>

        </section>


        {/* STEP 05 */}

        <section className="practice-section">

          <div className="practice-section-heading">

            <div className="practice-step">
              05
            </div>

            <div>

              <p>
                SPEED CHALLENGE
              </p>

              <h2>
                How much time per question?
              </h2>

            </div>

          </div>


          <div className="time-grid">

            {[10, 20, 30, 40, 50, 60].map(
              (seconds) => {

                const active =
                  timePerQuestion === seconds

                const label =
                  seconds === 60
                    ? 'Relaxed'
                    : seconds === 30
                    ? 'Standard'
                    : seconds === 20
                    ? 'Fast'
                    : seconds === 10
                    ? 'Extreme'
                    : ''

                return (

                  <button
                    type="button"
                    key={seconds}
                    className={`time-card ${
                      active
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() =>
                      setTimePerQuestion(
                        seconds
                      )
                    }
                  >

                    <strong>
                      {seconds}s
                    </strong>

                    <span>
                      {label ||
                        'per question'}
                    </span>

                    {active && (
                      <span className="selected-mark">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M5 12l4 4L19 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    )}

                  </button>

                )
              }
            )}

          </div>

          <p className="speed-note">
            The timer resets for every question.
            When time runs out, Overmaths records
            the question and moves you forward.
          </p>

        </section>


        {/* SESSION PREVIEW */}

        <section className="practice-summary">

          <div className="summary-content">

            <p className="summary-kicker">
              SESSION PREVIEW
            </p>

            <h2>
              {selectedTitle}
            </h2>

            <p>
              {selectedDescription}
            </p>

          </div>


          <div className="summary-details">

            <div>
              <span>TOPIC</span>
              <strong>
                {topic === 'mixed'
                  ? 'Mixed'
                  : topic}
              </strong>
            </div>

            <div>
              <span>MODE</span>
              <strong>
                {mode === 'practice'
                  ? 'Practice'
                  : 'Quiz'}
              </strong>
            </div>

            <div>
              <span>QUESTIONS</span>
              <strong>
                {questionCount}
              </strong>
            </div>

            <div>
              <span>TIME</span>
              <strong>
                {timePerQuestion}s
              </strong>
            </div>

          </div>


          <button
            type="button"
            className="start-session-button"
            onClick={handleStart}
          >

            Start Session

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

      <footer className="practice-footer">

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
  ---------------------------------------------------------
  SUBJECT / COURSE ICON HELPERS
  ---------------------------------------------------------
*/

function getCourseIcon(code = '') {
  const normalized =
    code.toUpperCase()

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


function getSubjectIcon(subject = '') {
  const normalized =
    subject.toLowerCase()

  if (normalized.includes('phys')) {
    return 'P'
  }

  if (
    normalized.includes('math') ||
    normalized.includes('mathemat')
  ) {
    return 'M'
  }

  if (
    normalized.includes('english')
  ) {
    return 'E'
  }

  if (
    normalized.includes('chem')
  ) {
    return 'C'
  }

  if (
    normalized.includes('biology')
  ) {
    return 'B'
  }

  return subject
    .charAt(0)
    .toUpperCase()
}


function getSubjectIconClass(
  subject = ''
) {
  const normalized =
    subject.toLowerCase()

  if (normalized.includes('phys')) {
    return 'physics-icon'
  }

  if (
    normalized.includes('math') ||
    normalized.includes('mathemat')
  ) {
    return 'maths-icon'
  }

  if (
    normalized.includes('english')
  ) {
    return 'english-icon'
  }

  if (
    normalized.includes('chem')
  ) {
    return 'chemistry-icon'
  }

  if (
    normalized.includes('biology')
  ) {
    return 'biology-icon'
  }

  return ''
}


export default Practice