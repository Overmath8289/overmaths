import '../App.css'
import logo from '../assets/overmaths-logo.png'
import { useNavigate } from 'react-router-dom'

function Icon({ name, size = 22 }) {
  const icons = {
    home: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.5V21h13V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </>
    ),

    book: (
      <>
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="M4 4.5v17" />
        <path d="M8 6h8" />
        <path d="M8 10h8" />
      </>
    ),

    chart: (
      <>
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-8" />
        <path d="M22 19V3" />
      </>
    ),

    crown: (
      <>
        <path d="m3 7 4 4 5-7 5 7 4-4-2 12H5z" />
        <path d="M5 22h14" />
      </>
    ),

    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),

    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),

    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),

    play: (
      <>
        <path d="m8 5 11 7-11 7z" />
      </>
    ),

    target: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
      </>
    ),

    lightning: (
      <>
        <path d="m13 2-9 12h7l-1 8 9-12h-7z" />
      </>
    ),

    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),

    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 20a6 6 0 0 1 12 0" />
        <path d="M15 15a5 5 0 0 1 6 5" />
      </>
    ),

    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),

    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),

    chevron: (
      <>
        <path d="m6 9 6 6 6-6" />
      </>
    ),
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  )
}

function LandingPage() {
  const navigate = useNavigate()

  const goToRegister = () => navigate('/register')
  const goToLogin = () => navigate('/login')

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
    })
  }

  return (
    <div className="overmaths-site">

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <header className="site-header">

        <div className="site-nav">

          <button
            className="brand"
            onClick={() => scrollTo('home')}
            aria-label="Overmaths Home"
          >
            <img src={logo} alt="Overmaths" />
          </button>

          <nav className="desktop-nav">

            <button onClick={() => scrollTo('home')}>
              <Icon name="home" size={17} />
              <span>Home</span>
            </button>

            <button onClick={() => scrollTo('courses')}>
              <Icon name="book" size={17} />
              <span>Courses</span>
            </button>

            <button onClick={() => scrollTo('how-it-works')}>
              <Icon name="target" size={17} />
              <span>How It Works</span>
            </button>

            <button onClick={() => scrollTo('pricing')}>
              <Icon name="crown" size={17} />
              <span>Premium</span>
            </button>

            <button onClick={() => scrollTo('about')}>
              <Icon name="users" size={17} />
              <span>About</span>
            </button>

          </nav>

          <div className="nav-actions">

            <button
              className="nav-login"
              onClick={goToLogin}
            >
              Sign In
            </button>

            <button
              className="nav-register"
              onClick={goToRegister}
            >
              Get Started
              <Icon name="arrow" size={16} />
            </button>

          </div>

        </div>

      </header>


      {/* =====================================================
          HERO
      ===================================================== */}

      <main>

        <section
          className="hero"
          id="home"
        >

          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />

          <div className="hero-inner">

            <div className="hero-copy">

              <div className="hero-eyebrow">
                <span className="eyebrow-dot" />
                SMART EXAM PRACTICE
              </div>

              <h1>
                Practice smarter.
                <br />
                <span>Master your exams.</span>
              </h1>

              <p className="hero-text">
                Prepare for JAMB, WAEC, NECO and university
                science courses with structured questions,
                instant results and intelligent performance
                tracking.
              </p>

              <div className="hero-actions">

                <button
                  className="hero-primary"
                  onClick={goToRegister}
                >
                  Start Practicing
                  <Icon name="arrow" size={18} />
                </button>

                <button
                  className="hero-secondary"
                  onClick={() => scrollTo('courses')}
                >
                  <span className="play-icon">
                    <Icon name="play" size={15} />
                  </span>
                  Explore Courses
                </button>

              </div>

              <div className="hero-trust">

                <div className="trust-item">
                  <span className="trust-icon">
                    <Icon name="check" size={16} />
                  </span>
                  <span>Instant Results</span>
                </div>

                <div className="trust-item">
                  <span className="trust-icon">
                    <Icon name="check" size={16} />
                  </span>
                  <span>Timed Tests</span>
                </div>

                <div className="trust-item">
                  <span className="trust-icon">
                    <Icon name="check" size={16} />
                  </span>
                  <span>Performance Tracking</span>
                </div>

              </div>

            </div>


            {/* HERO PRODUCT PREVIEW */}

            <div className="hero-visual">

              <div className="visual-glow" />

              <div className="floating-stat stat-one">
                <div className="stat-icon purple">
                  <Icon name="chart" size={18} />
                </div>

                <div>
                  <strong>+24%</strong>
                  <span>Performance</span>
                </div>
              </div>


              <div className="floating-stat stat-two">
                <div className="stat-icon orange">
                  <Icon name="check" size={18} />
                </div>

                <div>
                  <strong>86%</strong>
                  <span>Accuracy</span>
                </div>
              </div>


              <div className="exam-window">

                <div className="window-top">

                  <div className="window-brand">
                    <div className="mini-logo">
                      O
                    </div>
                    <span>Overmaths Practice</span>
                  </div>

                  <div className="window-timer">
                    <span className="timer-dot" />
                    01:42
                  </div>

                </div>


                <div className="exam-content">

                  <div className="exam-meta">
                    <span>PHYSICS 101</span>
                    <span>QUESTION 12 / 50</span>
                  </div>

                  <div className="exam-progress">
                    <div />
                  </div>

                  <h3>
                    A body moves with an initial velocity
                    of 20 m/s and accelerates uniformly at
                    5 m/s². What will its velocity be after
                    4 seconds?
                  </h3>


                  <div className="answer-list">

                    <div className="answer">
                      <span>A</span>
                      25 m/s
                    </div>

                    <div className="answer selected">
                      <span>B</span>
                      40 m/s

                      <div className="answer-check">
                        <Icon name="check" size={13} />
                      </div>
                    </div>

                    <div className="answer">
                      <span>C</span>
                      45 m/s
                    </div>

                    <div className="answer">
                      <span>D</span>
                      50 m/s
                    </div>

                  </div>


                  <div className="exam-bottom">

                    <span>
                      <Icon name="lightning" size={14} />
                      Timed Practice
                    </span>

                    <button>
                      Next
                      <Icon name="arrow" size={14} />
                    </button>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            STATS STRIP
        ===================================================== */}

        <section className="stats-strip">

          <div className="stats-inner">

            <div className="stat-block">
              <strong>MCQ</strong>
              <span>Exam-focused practice</span>
            </div>

            <div className="stat-divider" />

            <div className="stat-block">
              <strong>JAMB</strong>
              <span>UTME preparation</span>
            </div>

            <div className="stat-divider" />

            <div className="stat-block">
              <strong>WAEC</strong>
              <span>O-Level preparation</span>
            </div>

            <div className="stat-divider" />

            <div className="stat-block">
              <strong>100L+</strong>
              <span>University courses</span>
            </div>

          </div>

        </section>


        {/* =====================================================
            COURSES
        ===================================================== */}

        <section
          className="section courses"
          id="courses"
        >

          <div className="section-heading">

            <div className="section-eyebrow">
              <span />
              OUR SUBJECTS
            </div>

            <h2>
              Everything you need to
              <span> practice with confidence.</span>
            </h2>

            <p>
              Focus on the subjects that matter most and
              build your confidence through realistic,
              examination-style questions.
            </p>

          </div>


          <div className="subject-grid">

            <button
              className="subject-item math"
              onClick={goToRegister}
            >

              <div className="subject-icon">
                ∑
              </div>

              <div className="subject-info">
                <small>SUBJECT</small>
                <h3>Mathematics</h3>
                <p>
                  Calculations, algebra, geometry and
                  examination practice.
                </p>
              </div>

              <span className="subject-arrow">
                <Icon name="arrow" size={18} />
              </span>

            </button>


            <button
              className="subject-item physics"
              onClick={goToRegister}
            >

              <div className="subject-icon">
                ⚛
              </div>

              <div className="subject-info">
                <small>SUBJECT</small>
                <h3>Physics</h3>
                <p>
                  Concepts, calculations, formulas and
                  realistic MCQs.
                </p>
              </div>

              <span className="subject-arrow">
                <Icon name="arrow" size={18} />
              </span>

            </button>


            <button
              className="subject-item chemistry"
              onClick={goToRegister}
            >

              <div className="subject-icon">
                ⚗
              </div>

              <div className="subject-info">
                <small>SUBJECT</small>
                <h3>Chemistry</h3>
                <p>
                  Reactions, concepts and structured
                  examination questions.
                </p>
              </div>

              <span className="subject-arrow">
                <Icon name="arrow" size={18} />
              </span>

            </button>

          </div>

        </section>


        {/* =====================================================
            HOW IT WORKS
        ===================================================== */}

        <section
          className="section how-section"
          id="how-it-works"
        >

          <div className="how-layout">

            <div className="how-copy">

              <div className="section-eyebrow">
                <span />
                HOW OVERMATHS WORKS
              </div>

              <h2>
                Your preparation,
                <span> made simpler.</span>
              </h2>

              <p>
                Stop guessing what to study. Choose your
                examination path, practice relevant questions,
                review your results and identify where you
                need to improve.
              </p>

              <button
                className="text-action"
                onClick={goToRegister}
              >
                Create your free account
                <Icon name="arrow" size={17} />
              </button>

            </div>


            <div className="steps">

              <div className="step">

                <div className="step-number">
                  01
                </div>

                <div className="step-icon">
                  <Icon name="user" size={22} />
                </div>

                <div>
                  <h3>Create your account</h3>
                  <p>
                    Sign up and tell Overmaths what
                    examination or course you are preparing for.
                  </p>
                </div>

              </div>


              <div className="step">

                <div className="step-number">
                  02
                </div>

                <div className="step-icon">
                  <Icon name="book" size={22} />
                </div>

                <div>
                  <h3>Choose what to practice</h3>
                  <p>
                    Select your subject, topic or university
                    course and start answering questions.
                  </p>
                </div>

              </div>


              <div className="step">

                <div className="step-number">
                  03
                </div>

                <div className="step-icon">
                  <Icon name="chart" size={22} />
                </div>

                <div>
                  <h3>Track your improvement</h3>
                  <p>
                    Review your results and use your
                    performance to guide your next practice.
                  </p>
                </div>

              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            PREMIUM
        ===================================================== */}

        <section
          className="premium-section"
          id="pricing"
        >

          <div className="premium-glow" />

          <div className="premium-inner">

            <div className="premium-copy">

              <div className="premium-badge">
                <Icon name="crown" size={15} />
                OVERMATHS PREMIUM
              </div>

              <h2>
                Take your preparation
                <span> further.</span>
              </h2>

              <p>
                Unlock a deeper practice experience designed
                for students who want more questions, more
                practice and more insight into their progress.
              </p>

              <button
                className="premium-action"
                onClick={goToRegister}
              >
                Explore Premium
                <Icon name="arrow" size={17} />
              </button>

            </div>


            <div className="premium-features">

              <div className="premium-feature">
                <span>
                  <Icon name="book" size={19} />
                </span>
                <div>
                  <strong>Expanded Question Library</strong>
                  <small>Practice more questions.</small>
                </div>
              </div>

              <div className="premium-feature">
                <span>
                  <Icon name="chart" size={19} />
                </span>
                <div>
                  <strong>Detailed Performance</strong>
                  <small>Understand your progress.</small>
                </div>
              </div>

              <div className="premium-feature">
                <span>
                  <Icon name="lightning" size={19} />
                </span>
                <div>
                  <strong>Advanced Practice</strong>
                  <small>Challenge yourself further.</small>
                </div>
              </div>

              <div className="premium-feature">
                <span>
                  <Icon name="target" size={19} />
                </span>
                <div>
                  <strong>Focused Preparation</strong>
                  <small>Practice with purpose.</small>
                </div>
              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            ABOUT
        ===================================================== */}

        <section
          className="section about"
          id="about"
        >

          <div className="about-visual">

            <div className="about-orbit orbit-one" />
            <div className="about-orbit orbit-two" />

            <div className="about-center">
              <img
                src={logo}
                alt="Overmaths"
              />
              <span>Smart Exam Practice</span>
            </div>

            <div className="about-floating floating-top">
              <Icon name="target" size={18} />
              <span>Practice</span>
            </div>

            <div className="about-floating floating-bottom">
              <Icon name="chart" size={18} />
              <span>Improve</span>
            </div>

          </div>


          <div className="about-copy">

            <div className="section-eyebrow">
              <span />
              ABOUT OVERMATHS
            </div>

            <h2>
              Built around the way
              <span> students prepare.</span>
            </h2>

            <p>
              Overmaths is an educational platform focused
              on structured examination practice.
            </p>

            <p>
              Our goal is simple: give students quality
              questions, useful feedback and a clearer way
              to understand their academic progress.
            </p>

            <div className="about-points">

              <div>
                <Icon name="check" size={17} />
                <span>Structured examination practice</span>
              </div>

              <div>
                <Icon name="check" size={17} />
                <span>Instant feedback</span>
              </div>

              <div>
                <Icon name="check" size={17} />
                <span>Progress-focused learning</span>
              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            FINAL CTA
        ===================================================== */}

        <section className="final-cta">

          <div className="cta-glow" />

          <div className="cta-content">

            <div className="section-eyebrow">
              <span />
              START TODAY
            </div>

            <h2>
              Your next practice session
              <span> starts here.</span>
            </h2>

            <p>
              Create your free Overmaths account and start
              preparing with focused examination practice.
            </p>

            <div className="cta-actions">

              <button
                className="hero-primary"
                onClick={goToRegister}
              >
                Create Free Account
                <Icon name="arrow" size={18} />
              </button>

              <button
                className="cta-login"
                onClick={goToLogin}
              >
                Already have an account?
                <strong>Sign In</strong>
              </button>

            </div>

          </div>

        </section>

      </main>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="site-footer">

        <div className="footer-top">

          <div className="footer-brand">

            <img
              src={logo}
              alt="Overmaths"
            />

            <p>
              Smart exam practice for students
              preparing for their next academic goal.
            </p>

            <div className="footer-social">

              <button aria-label="Facebook">
                f
              </button>

              <button aria-label="Instagram">
                ◎
              </button>

              <button aria-label="TikTok">
                ♪
              </button>

            </div>

          </div>


          <div className="footer-column">

            <h4>Platform</h4>

            <button onClick={() => scrollTo('home')}>
              Home
            </button>

            <button onClick={() => scrollTo('courses')}>
              Courses
            </button>

            <button onClick={() => scrollTo('pricing')}>
              Premium
            </button>

            <button onClick={() => scrollTo('how-it-works')}>
              How It Works
            </button>

          </div>


          <div className="footer-column">

            <h4>Account</h4>

            <button onClick={goToLogin}>
              Sign In
            </button>

            <button onClick={goToRegister}>
              Create Account
            </button>

            <button onClick={goToRegister}>
              Get Started
            </button>

          </div>


          <div className="footer-column">

            <h4>Learning</h4>

            <button onClick={goToRegister}>
              Mathematics
            </button>

            <button onClick={goToRegister}>
              Physics
            </button>

            <button onClick={goToRegister}>
              Chemistry
            </button>

            <button onClick={goToRegister}>
              Exam Practice
            </button>

          </div>

        </div>


        <div className="footer-bottom">

          <span>
            © {new Date().getFullYear()} Overmaths.
            All rights reserved.
          </span>

          <span>
            Practice smarter. Master your exams.
          </span>

        </div>

      </footer>

    </div>
  )
}

export default LandingPage