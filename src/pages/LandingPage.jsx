import '../App.css'
import logo from '../assets/overmaths-logo.png'

function LandingPage() {
  return (
    <div className="app">
      <header className="navbar">
        <div className="logo">
          <img src={logo} alt="Overmaths Logo" />
        </div>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#courses">Courses</a>
          <a href="#pricing">Pricing</a>
          <a href="#about">About</a>
        </nav>

        <div className="nav-buttons">
          <button className="login-btn">
            Login
          </button>

          <button
            className="signup-btn"
            onClick={() => window.location.href = '/register'}
          >
            Get Started
          </button>
        </div>
      </header>

      <main>
        <section className="hero-section" id="home">
          <div className="hero-content">
            <p className="hero-tag">
              MATHEMATICS • PHYSICS • CHEMISTRY
            </p>

            <h1>
              Practice smarter.
              <br />
              <span>Master your exams.</span>
            </h1>

            <p className="hero-description">
              Prepare for your O-Level and 100-level science courses with
              carefully structured MCQ tests, instant results and detailed
              performance tracking.
            </p>

            <div className="hero-buttons">
              <button
                className="primary-btn"
                onClick={() => window.location.href = '/register'}
              >
                Start Practicing
              </button>

              <button className="secondary-btn">
                Explore Courses
              </button>
            </div>

            <div className="hero-features">
              <div>
                <strong>✓</strong>
                <span>Timed Tests</span>
              </div>

              <div>
                <strong>✓</strong>
                <span>Instant Results</span>
              </div>

              <div>
                <strong>✓</strong>
                <span>Performance Tracking</span>
              </div>
            </div>
          </div>

          <div className="hero-card">
            <div className="question-card">
              <div className="question-top">
                <span>Physics 101</span>
                <span>01:42</span>
              </div>

              <h3>
                A body moves with a velocity of 20 m/s. If it accelerates
                uniformly at 5 m/s², what will its velocity be after 4 seconds?
              </h3>

              <div className="options">
                <button>A. 25 m/s</button>
                <button>B. 30 m/s</button>
                <button>C. 35 m/s</button>
                <button>D. 40 m/s</button>
              </div>

              <div className="question-progress">
                <span>Question 1 of 50</span>

                <div className="progress-bar">
                  <div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="courses-section" id="courses">
          <p className="section-label">OUR COURSES</p>

          <h2>Build confidence through practice</h2>

          <p className="section-description">
            Focus on the subjects that matter most and test yourself with
            realistic multiple-choice questions.
          </p>

          <div className="course-grid">
            <div className="course-card mathematics">
              <div className="course-icon">∑</div>

              <h3>Mathematics</h3>

              <p>
                Strengthen your understanding through structured mathematical
                practice.
              </p>

              <button>Explore Mathematics →</button>
            </div>

            <div className="course-card physics">
              <div className="course-icon">⚛</div>

              <h3>Physics</h3>

              <p>
                Practice calculations, concepts, formulas and examination-style
                questions.
              </p>

              <button>Explore Physics →</button>
            </div>

            <div className="course-card chemistry">
              <div className="course-icon">⚗</div>

              <h3>Chemistry</h3>

              <p>
                Test your knowledge of chemistry concepts with carefully
                selected MCQs.
              </p>

              <button>Explore Chemistry →</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default LandingPage



