import React from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const graduationImage =
"https://images.openai.com/static-rsc-4/88imW6NgAxODqiJKtKMyUXwv6p57AhZrN17mFgwpmd8cu_zZHsd8wOhA0pAngKgpGbkSNozfljX81x7IMGuUbDfWgZMKw5URHhystmxHLaFAHh0lqJzMWL9QAx5Y8cxDK_npPAsUOWceUUyXB6SIpNAUOvxfuUtR-9f2XnL29JqZ8oGkDmszFoxpygYfuzeM?purpose=fullsizet";

const subjects = [
{ name: "Mathematics", code: "MTH", description: "Build confidence in calculations and problem-solving.", icon: "∑", color: "violet" },
{ name: "Physics", code: "PHY", description: "Understand concepts, laws, and practical applications.", icon: "⚛", color: "blue" },
{ name: "Chemistry", code: "CHM", description: "Master reactions, equations, and chemical principles.", icon: "⚗", color: "orange" },
{ name: "Biology", code: "BIO", description: "Explore living things and biological systems.", icon: "⌘", color: "green" },
];

const steps = [
{ number: "01", title: "Choose your learning path", description: "Select your exam, subject, or university course." },
{ number: "02", title: "Practise with purpose", description: "Answer questions and build confidence one session at a time." },
{ number: "03", title: "Track your progress", description: "Review your performance and discover where to improve." },
];

function Arrow({ diagonal = false }) {
return <span aria-hidden="true">{diagonal ? "↗" : "→"}</span>;
}

function LandingPage() {
const navigate = useNavigate();

const goTo = (path) => navigate(path);

return ( <div className="overmaths-site"> <header className="site-header">
<button
className="brand"
type="button"
onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
aria-label="Overmaths home"
> <span className="brand-mark">O</span> <span className="brand-name">Over<span>maths</span></span> </button>

```
    <nav className="desktop-nav" aria-label="Main navigation">
      <a href="#home">Home</a>
      <a href="#subjects">Subjects</a>
      <a href="#how-it-works">How it works</a>
      <a href="#premium">Premium</a>
      <a href="#about">About</a>
    </nav>

    <div className="header-actions">
      <button className="nav-login" onClick={() => goTo("/login")}>
        Log in
      </button>
      <button className="nav-register" onClick={() => goTo("/register")}>
        Get started <Arrow />
      </button>
    </div>
  </header>

  <main>
    <section className="hero" id="home">
      <div className="hero-copy">
        <span className="eyebrow">
          <span className="eyebrow-dot" />
          YOUR LEARNING JOURNEY STARTS HERE
        </span>

        <h1>
          Prepare smarter.
          <br />
          <span>Achieve more.</span>
        </h1>

        <p className="hero-text">
          Your goals deserve more than guesswork. Practise with purpose,
          strengthen your understanding, and build the confidence to face
          your next examination.
        </p>

        <div className="hero-actions">
          <button className="hero-primary" onClick={() => goTo("/register")}>
            Start learning <Arrow />
          </button>
          <a className="hero-secondary" href="#how-it-works">
            Discover how it works <Arrow diagonal />
          </a>
        </div>

        <div className="trust-row">
          <span><b>✓</b> Learn at your pace</span>
          <span><b>✓</b> Practise by subject</span>
          <span><b>✓</b> Monitor your progress</span>
        </div>
      </div>

      <div className="hero-visual hero-photo-visual">
        <div className="hero-photo-frame">
          <img
            className="hero-graduation-image"
            src={graduationImage}
            alt="Graduates celebrating their academic achievement"
          />
          <div className="hero-photo-shade" />
          <div className="hero-photo-caption">
            <span className="photo-caption-mark">✓</span>
            <div>
              <strong>Your next achievement starts here.</strong>
              <small>Prepare with purpose on Overmaths.</small>
            </div>
          </div>
        </div>

        <div className="floating-stat stat-one">
          <span className="stat-icon purple">↗</span>
          <div><strong>Keep improving</strong><span>One session at a time</span></div>
        </div>

        <div className="floating-stat stat-two">
          <span className="stat-icon orange">✓</span>
          <div><strong>Learn confidently</strong><span>Practise with purpose</span></div>
        </div>

        <div className="photo-note">JAMB · WAEC · NECO · UNIVERSITY</div>
      </div>
    </section>

    <section className="stats-strip" aria-label="Overmaths benefits">
      <div className="stat-block">
        <strong>One platform</strong>
        <span>For your learning journey</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-block">
        <strong>Flexible practice</strong>
        <span>Study on your schedule</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-block">
        <strong>Clear progress</strong>
        <span>Know what to work on next</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-block">
        <strong>More confidence</strong>
        <span>Prepare with a plan</span>
      </div>
    </section>

    <section className="subjects-section section-pad" id="subjects">
      <div className="section-heading">
        <span className="eyebrow">YOUR STUDY SPACE</span>
        <h2>Make every practice session count.</h2>
        <p>
          Focus on the subjects and courses that matter to your goals.
          Build your understanding one question at a time.
        </p>
      </div>

      <div className="subject-grid">
        {subjects.map((subject) => (
          <article className="subject-item" key={subject.code}>
            <div className={`subject-icon ${subject.color}`}>{subject.icon}</div>
            <span className="subject-code">{subject.code}</span>
            <h3>{subject.name}</h3>
            <p>{subject.description}</p>
            <button
              className="subject-link"
              onClick={() => goTo("/register")}
            >
              Start practising <Arrow />
            </button>
          </article>
        ))}
      </div>

      <p className="subjects-note">
        More subjects and university courses can be explored in your learning dashboard.
      </p>
    </section>

    <section className="how-section section-pad" id="how-it-works">
      <div className="how-copy">
        <span className="eyebrow">SIMPLE BY DESIGN</span>
        <h2>A better way to prepare for your next step.</h2>
        <p>
          Turn your study time into a consistent habit with a learning
          experience designed to help you focus and keep moving forward.
        </p>
        <button className="hero-primary" onClick={() => goTo("/register")}>
          Begin your journey <Arrow />
        </button>
      </div>

      <div className="steps-list">
        {steps.map((step) => (
          <article className="step" key={step.number}>
            <span className="step-number">{step.number}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
            <span className="step-arrow">↗</span>
          </article>
        ))}
      </div>
    </section>

    <section className="premium-section section-pad" id="premium">
      <div className="premium-copy">
        <span className="premium-eyebrow">THE NEXT LEVEL OF PREPARATION</span>
        <h2>Ready to take your learning further?</h2>
        <p>
          Explore Overmaths Premium for an enhanced learning experience
          built for students who want to take their preparation seriously.
        </p>

        <div className="premium-features">
          <div className="premium-feature"><span>✓</span> A more focused study experience</div>
          <div className="premium-feature"><span>✓</span> Tools to support consistent practice</div>
          <div className="premium-feature"><span>✓</span> A dedicated space for your learning goals</div>
        </div>

        <button className="premium-action" onClick={() => goTo("/premium")}>
          Explore Premium <Arrow />
        </button>
        <small className="premium-note">
          Available features depend on your current Overmaths subscription.
        </small>
      </div>

      <div className="premium-art" aria-hidden="true">
        <div className="premium-orbit orbit-one" />
        <div className="premium-orbit orbit-two" />
        <div className="premium-glass-card">
          <span className="premium-crown">✦</span>
          <small>YOUR NEXT CHAPTER</small>
          <strong>Learn with<br />more purpose.</strong>
          <span className="premium-card-line" />
          <span className="premium-card-footer">OVERMATHS PREMIUM</span>
        </div>
        <span className="premium-bubble bubble-one">Focus</span>
        <span className="premium-bubble bubble-two">Progress</span>
      </div>
    </section>

    <section className="about-section section-pad" id="about">
      <div className="about-copy">
        <span className="eyebrow">ABOUT OVERMATHS</span>
        <h2>Built around your ambition.</h2>
        <p>
          Overmaths is a learning and practice platform created to help
          students approach their examinations and academic goals with
          greater structure, clarity, and confidence.
        </p>
        <p>
          Whether you are preparing for an external examination or studying
          university courses, the aim is to make purposeful practice a
          natural part of your learning journey.
        </p>
        <button className="text-link" onClick={() => goTo("/register")}>
          Start learning with Overmaths <Arrow />
        </button>
      </div>

      <div className="about-visual">
        <div className="about-orbit" />
        <div className="about-center">
          <span className="about-logo">O</span>
          <strong>Over<span>maths</span></strong>
          <small>LEARN · PRACTISE · GROW</small>
        </div>
        <div className="about-floating about-float-top">Your goals matter.</div>
        <div className="about-floating about-float-bottom">Keep moving forward ↗</div>
      </div>
    </section>

    <section className="final-cta">
      <div className="final-cta-content">
        <span className="eyebrow cta-eyebrow">YOUR FUTURE IS WORTH THE EFFORT</span>
        <h2>Take the next step<br />towards your goals.</h2>
        <p>
          Start building better study habits today. Your next achievement
          begins with one focused session.
        </p>
        <div className="hero-actions">
          <button className="hero-primary" onClick={() => goTo("/register")}>
            Create your account <Arrow />
          </button>
          <button className="cta-login" onClick={() => goTo("/login")}>
            Already a member? Log in
          </button>
        </div>
      </div>
    </section>
  </main>

  <footer className="site-footer">
    <div className="footer-main">
      <div className="footer-brand">
        <button className="brand footer-brand-button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span className="brand-mark">O</span>
          <span className="brand-name">Over<span>maths</span></span>
        </button>
        <p>Prepare smarter. Practise with purpose. Keep achieving.</p>
      </div>

      <div className="footer-column">
        <h4>Explore</h4>
        <a href="#subjects">Subjects</a>
        <a href="#how-it-works">How it works</a>
        <a href="#premium">Premium</a>
      </div>

      <div className="footer-column">
        <h4>Your account</h4>
        <button onClick={() => goTo("/register")}>Create account</button>
        <button onClick={() => goTo("/login")}>Log in</button>
        <button onClick={() => goTo("/dashboard")}>Dashboard</button>
      </div>

      <div className="footer-column">
        <h4>Learn more</h4>
        <a href="#about">About Overmaths</a>
        <button onClick={() => goTo("/premium")}>Premium access</button>
      </div>
    </div>

    <div className="footer-bottom">
      <span>© {new Date().getFullYear()} Overmaths. All rights reserved.</span>
      <span>Built to support your learning journey.</span>
    </div>
  </footer>
</div>
```

);
}

export default LandingPage;
