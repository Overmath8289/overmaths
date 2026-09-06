import '../App.css'
import logo from '../assets/overmaths-logo.png'

function LandingPage() {
  const goToRegister = () => {
    window.location.href = '/register'
  }

  const goToLogin = () => {
    window.location.href = '/login'
  }

  const exploreCourses = () => {
    document.getElementById('courses')?.scrollIntoView({
      behavior: 'smooth',
    })
  }

  return (
    <div className="app">

      {/* =========================
          NAVBAR
      ========================= */}
      <header className="navbar">

        <div className="logo">
          <img src={logo} alt="Overmaths Logo" />
        </div>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#courses">Courses</a>
          <a href="#pricing">Pricing</a>
          <a href="#about">About</a>
          <a href="#referrals">Referrals</a>
        </nav>

        <div className="nav-buttons">

          <button
            className="login-btn"
            onClick={goToLogin}
          >
            Login
          </button>

          <button
            className="signup-btn"
            onClick={goToRegister}
          >
            Get Started
          </button>

        </div>

      </header>


      <main>

        {/* =========================
            HERO
        ========================= */}
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
              Prepare for your O-Level and 100-level science courses
              with carefully structured MCQ tests, instant results and
              detailed performance tracking.
            </p>

            <div className="hero-buttons">

              <button
                className="primary-btn"
                onClick={goToRegister}
              >
                Start Practicing
              </button>

              <button
                className="secondary-btn"
                onClick={exploreCourses}
              >
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
                A body moves with a velocity of 20 m/s. If it
                accelerates uniformly at 5 m/s², what will its
                velocity be after 4 seconds?
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


        {/* =========================
            COURSES
        ========================= */}
        <section className="courses-section" id="courses">

          <p className="section-label">
            OUR COURSES
          </p>

          <h2>
            Build confidence through practice
          </h2>

          <p className="section-description">
            Focus on the subjects that matter most and test yourself
            with realistic multiple-choice questions.
          </p>

          <div className="course-grid">

            <div className="course-card mathematics">

              <div className="course-icon">
                ∑
              </div>

              <h3>
                Mathematics
              </h3>

              <p>
                Strengthen your understanding through structured
                mathematical practice.
              </p>

              <button onClick={goToRegister}>
                Explore Mathematics →
              </button>

            </div>


            <div className="course-card physics">

              <div className="course-icon">
                ⚛
              </div>

              <h3>
                Physics
              </h3>

              <p>
                Practice calculations, concepts, formulas and
                examination-style questions.
              </p>

              <button onClick={goToRegister}>
                Explore Physics →
              </button>

            </div>


            <div className="course-card chemistry">

              <div className="course-icon">
                ⚗
              </div>

              <h3>
                Chemistry
              </h3>

              <p>
                Test your knowledge of chemistry concepts with
                carefully selected MCQs.
              </p>

              <button onClick={goToRegister}>
                Explore Chemistry →
              </button>

            </div>

          </div>

        </section>


        {/* =========================
            PRICING
        ========================= */}
        <section className="pricing-section" id="pricing">

          <p className="section-label">
            PRICING
          </p>

          <h2>
            Simple plans. Serious preparation.
          </h2>

          <p className="section-description">
            Start preparing with Overmaths and choose the plan
            that fits your learning needs.
          </p>

          <div className="pricing-grid">

            <div className="pricing-card">

              <p className="pricing-name">
                FREE
              </p>

              <h3>
                ₦0
              </h3>

              <p className="pricing-period">
                Get started
              </p>

              <div className="pricing-features">

                <p>✓ Access to selected practice questions</p>
                <p>✓ Basic exam practice</p>
                <p>✓ Instant results</p>
                <p>✓ Create your Overmaths account</p>

              </div>

              <button
                className="pricing-btn"
                onClick={goToRegister}
              >
                Get Started
              </button>

            </div>


            <div className="pricing-card featured">

              <div className="popular-badge">
                MOST POPULAR
              </div>

              <p className="pricing-name">
                PREMIUM
              </p>

              <h3>
                Coming Soon
              </h3>

              <p className="pricing-period">
                Premium learning experience
              </p>

              <div className="pricing-features">

                <p>✓ Expanded question library</p>
                <p>✓ More practice tests</p>
                <p>✓ Detailed performance tracking</p>
                <p>✓ Advanced learning features</p>

              </div>

              <button
                className="pricing-btn"
                onClick={goToRegister}
              >
                Join Overmaths
              </button>

            </div>


            <div className="pricing-card">

              <p className="pricing-name">
                FUTURE
              </p>

              <h3>
                More Coming
              </h3>

              <p className="pricing-period">
                We're building more for you
              </p>

              <div className="pricing-features">

                <p>✓ More subjects</p>
                <p>✓ More examination levels</p>
                <p>✓ More learning tools</p>
                <p>✓ Continuous improvements</p>

              </div>

              <button
                className="pricing-btn"
                onClick={goToRegister}
              >
                Start Learning
              </button>

            </div>

          </div>

        </section>


        {/* =========================
            ABOUT
        ========================= */}
        <section className="about-section" id="about">

          <div className="about-content">

            <p className="section-label">
              ABOUT OVERMATHS
            </p>

            <h2>
              A smarter way to prepare for exams.
            </h2>

            <p>
              Overmaths is an educational platform designed to help
              students improve their understanding and confidence
              through structured examination practice.
            </p>

            <p>
              Our focus is simple: give students quality questions,
              useful feedback and a better way to understand their
              academic progress.
            </p>

            <button
              className="primary-btn"
              onClick={goToRegister}
            >
              Start Practicing
            </button>

          </div>


          <div className="about-highlights">

            <div className="about-box">
              <strong>01</strong>
              <h3>Practice</h3>
              <p>
                Test yourself with structured examination-style
                questions.
              </p>
            </div>

            <div className="about-box">
              <strong>02</strong>
              <h3>Learn</h3>
              <p>
                Identify areas where you need more understanding
                and practice.
              </p>
            </div>

            <div className="about-box">
              <strong>03</strong>
              <h3>Improve</h3>
              <p>
                Track your progress and build confidence over time.
              </p>
            </div>

          </div>

        </section>


        {/* =========================
            REFERRAL
        ========================= */}
        <section className="referral-section" id="referrals">

          <div className="referral-content">

            <p className="section-label">
              OVERMATHS REFERRALS
            </p>

            <h2>
              Share Overmaths. Grow with us.
            </h2>

            <p>
              Invite friends, classmates and other students to join
              Overmaths. Our referral programme is being prepared to
              reward successful referrals as the platform grows.
            </p>

            <button
              className="referral-btn"
              onClick={goToRegister}
            >
              Generate Referral Code
            </button>

            <small>
              Referral rewards and commission tracking will become
              available when the referral programme launches.
            </small>

          </div>

        </section>

      </main>


      {/* =========================
          FOOTER
      ========================= */}
      <footer className="footer">

        <div className="footer-main">

          <div className="footer-brand">

            <img
              src={logo}
              alt="Overmaths Logo"
            />

            <p>
              Smart Exam Practice
            </p>

            <span>
              Practice smarter. Master your exams.
            </span>

          </div>


          <div className="footer-links">

            <div>
              <h4>Platform</h4>

              <a href="#home">Home</a>
              <a href="#courses">Courses</a>
              <a href="#pricing">Pricing</a>
              <a href="#about">About</a>

            </div>


            <div>
              <h4>Account</h4>

              <button onClick={goToLogin}>
                Login
              </button>

              <button onClick={goToRegister}>
                Create Account
              </button>

              <a href="#referrals">
                Referrals
              </a>

            </div>

          </div>

        </div>


        <div className="footer-bottom">

          <p>
            © {new Date().getFullYear()} Overmaths. All rights reserved.
          </p>

          <p>
            Smart Exam Practice
          </p>

        </div>

      </footer>

    </div>
  )
}

export default LandingPage