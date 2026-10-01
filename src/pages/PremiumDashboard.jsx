import React from 'react'
import { useNavigate } from 'react-router-dom'
import './PremiumDashboard.css'

function PremiumDashboard() {
  const navigate = useNavigate()

  return (
    <div className="premium-page">

      {/* Background atmosphere */}
      <div className="premium-bg-glow premium-glow-one"></div>
      <div className="premium-bg-glow premium-glow-two"></div>

      {/* Sidebar */}
      <aside className="premium-sidebar">

        <div className="premium-brand">
          <div className="premium-brand-mark">
            O
          </div>

          <div>
            <strong>OVERMATHS</strong>
            <span>PREMIUM</span>
          </div>
        </div>

        <nav className="premium-nav">

          <button className="premium-nav-item active">
            <span>⌂</span>
            Command Center
          </button>

          <button className="premium-nav-item">
            <span>🎯</span>
            My Exam
          </button>

          <button className="premium-nav-item">
            <span>◈</span>
            Practice
          </button>

          <button className="premium-nav-item">
            <span>◷</span>
            Smart Revision
          </button>

          <button className="premium-nav-item">
            <span>⚡</span>
            Challenges
          </button>

          <button className="premium-nav-item">
            <span>▥</span>
            Performance
          </button>

          <button className="premium-nav-item">
            <span>🏆</span>
            Achievements
          </button>

        </nav>

        <div className="premium-sidebar-bottom">

          <div className="premium-upgrade-card">
            <span className="upgrade-label">
              PREMIUM
            </span>

            <strong>
              Your preparation,
              <br />
              upgraded.
            </strong>

            <small>
              Keep building your exam journey.
            </small>
          </div>

          <button
            className="premium-back-button"
            onClick={() => navigate('/dashboard')}
          >
            ← Back to Dashboard
          </button>

        </div>

      </aside>

      {/* Main */}
      <main className="premium-main">

        {/* Header */}
        <header className="premium-header">

          <div>
            <p className="premium-eyebrow">
              OVERMATHS PREMIUM
            </p>

            <h1>
              Good morning, Student.
            </h1>

            <p className="premium-header-description">
              Your preparation is moving forward. Here's what deserves
              your attention today.
            </p>
          </div>

          <div className="premium-profile">

            <div className="premium-profile-avatar">
              S
            </div>

            <div>
              <strong>
                Premium Student
              </strong>

              <span>
                Level 12 · 2,840 XP
              </span>
            </div>

          </div>

        </header>


        {/* Main stats */}
        <section className="premium-stat-grid">

          <div className="premium-stat-card featured">

            <div className="stat-card-top">
              <span>
                EXAM COUNTDOWN
              </span>

              <span className="stat-icon">
                ◷
              </span>
            </div>

            <strong className="countdown-number">
              247
            </strong>

            <span className="countdown-label">
              DAYS TO EXAM
            </span>

            <div className="stat-card-footer">
              <span>
                JAMB · 2027
              </span>

              <button>
                View plan →
              </button>
            </div>

          </div>


          <div className="premium-stat-card">

            <div className="stat-card-top">
              <span>
                TARGET SCORE
              </span>

              <span className="stat-icon">
                🎯
              </span>
            </div>

            <strong>
              280
            </strong>

            <span className="stat-description">
              Your current target
            </span>

            <div className="mini-progress">
              <div style={{ width: '73%' }}></div>
            </div>

            <small>
              73% preparation progress
            </small>

          </div>


          <div className="premium-stat-card">

            <div className="stat-card-top">
              <span>
                READINESS
              </span>

              <span className="stat-icon">
                ◉
              </span>
            </div>

            <strong>
              68%
            </strong>

            <span className="stat-description">
              Overall preparation
            </span>

            <div className="readiness-status">
              <span></span>
              On track
            </div>

          </div>


          <div className="premium-stat-card">

            <div className="stat-card-top">
              <span>
                STUDY STREAK
              </span>

              <span className="stat-icon">
                🔥
              </span>
            </div>

            <strong>
              12
            </strong>

            <span className="stat-description">
              Consecutive study days
            </span>

            <small className="positive-text">
              +4 days this month
            </small>

          </div>

        </section>


        {/* Today's mission */}
        <section className="premium-mission">

          <div className="mission-content">

            <div className="mission-label">
              <span className="mission-dot"></span>
              TODAY'S MISSION
            </div>

            <h2>
              Strengthen your Waves
              <br />
              foundation.
            </h2>

            <p>
              Your recent performance shows that Waves needs
              attention. Complete today's targeted session to
              improve your mastery.
            </p>

            <div className="mission-meta">

              <span>
                ◈ Physics
              </span>

              <span>
                15 Questions
              </span>

              <span>
                20 Minutes
              </span>

            </div>

            <button className="premium-primary-button">
              Start Mission
              <span>→</span>
            </button>

          </div>


          <div className="mission-visual">

            <div className="mission-orbit orbit-one"></div>
            <div className="mission-orbit orbit-two"></div>

            <div className="mission-core">
              <span>58%</span>
              <small>MASTERY</small>
            </div>

          </div>

        </section>


        {/* Two-column area */}
        <section className="premium-content-grid">


          {/* Performance */}
          <div className="premium-panel performance-panel">

            <div className="panel-header">

              <div>
                <span className="panel-label">
                  PERFORMANCE
                </span>

                <h3>
                  Your progress
                </h3>
              </div>

              <button className="panel-action">
                Last 30 days ▾
              </button>

            </div>

            <div className="performance-score">

              <strong>
                76%
              </strong>

              <span>
                +11.4%
              </span>

              <small>
                Average accuracy
              </small>

            </div>

            <div className="fake-chart">

              <div className="chart-grid-line line-one"></div>
              <div className="chart-grid-line line-two"></div>
              <div className="chart-grid-line line-three"></div>

              <div className="chart-line">

                <span className="chart-point point-one"></span>
                <span className="chart-point point-two"></span>
                <span className="chart-point point-three"></span>
                <span className="chart-point point-four"></span>
                <span className="chart-point point-five"></span>
                <span className="chart-point point-six"></span>
                <span className="chart-point point-seven"></span>

              </div>

              <div className="chart-labels">
                <span>Sep 1</span>
                <span>Sep 8</span>
                <span>Sep 15</span>
                <span>Sep 22</span>
                <span>Oct 1</span>
              </div>

            </div>

          </div>


          {/* Weak areas */}
          <div className="premium-panel">

            <div className="panel-header">

              <div>
                <span className="panel-label">
                  INTELLIGENCE
                </span>

                <h3>
                  Areas to improve
                </h3>
              </div>

              <button className="text-button">
                View all →
              </button>

            </div>


            <div className="weak-area">

              <div className="weak-area-info">

                <strong>
                  Waves
                </strong>

                <span>
                  Physics
                </span>

              </div>

              <div className="weak-area-score">
                58%
              </div>

              <div className="weak-progress">
                <div style={{ width: '58%' }}></div>
              </div>

            </div>


            <div className="weak-area">

              <div className="weak-area-info">

                <strong>
                  Trigonometry
                </strong>

                <span>
                  Mathematics
                </span>

              </div>

              <div className="weak-area-score">
                64%
              </div>

              <div className="weak-progress">
                <div style={{ width: '64%' }}></div>
              </div>

            </div>


            <div className="weak-area">

              <div className="weak-area-info">

                <strong>
                  Organic Chemistry
                </strong>

                <span>
                  Chemistry
                </span>

              </div>

              <div className="weak-area-score">
                71%
              </div>

              <div className="weak-progress">
                <div style={{ width: '71%' }}></div>
              </div>

            </div>

          </div>

        </section>


        {/* Bottom cards */}
        <section className="premium-bottom-grid">


          {/* Journey */}
          <div className="premium-panel journey-panel">

            <div className="panel-header">

              <div>
                <span className="panel-label">
                  YOUR JOURNEY
                </span>

                <h3>
                  Keep climbing.
                </h3>
              </div>

              <span className="level-badge">
                LEVEL 12
              </span>

            </div>

            <div className="journey-progress">

              <div className="journey-progress-header">
                <span>
                  2,840 XP
                </span>

                <span>
                  3,000 XP
                </span>
              </div>

              <div className="journey-bar">
                <div></div>
              </div>

            </div>

            <div className="achievement-row">

              <div>
                <span>🔥</span>
                <strong>12</strong>
                <small>Day streak</small>
              </div>

              <div>
                <span>🏆</span>
                <strong>8</strong>
                <small>Achievements</small>
              </div>

              <div>
                <span>⚡</span>
                <strong>143</strong>
                <small>Best day</small>
              </div>

            </div>

          </div>


          {/* Coach */}
          <div className="premium-panel coach-panel">

            <div className="coach-icon">
              ✦
            </div>

            <div className="coach-content">

              <span className="panel-label">
                OVERMATHS COACH
              </span>

              <h3>
                You're making progress.
              </h3>

              <p>
                Your Physics accuracy has improved by 11%
                this month. Your next priority should be Waves.
              </p>

              <button className="text-button">
                View full analysis →
              </button>

            </div>

          </div>

        </section>

      </main>

    </div>
  )
}

export default PremiumDashboard