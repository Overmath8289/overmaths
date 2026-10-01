import React from 'react'
import { useNavigate } from 'react-router-dom'
import './PremiumUpgrade.css'

function PremiumUpgrade() {
  const navigate = useNavigate()

  const handleSubscribe = (plan) => {
    console.log('Selected Premium plan:', plan)

    // Payment integration will be connected here.
    // Later:
    // 1. Create payment
    // 2. Verify payment
    // 3. Create subscription in Supabase
    // 4. Redirect to /premium
  }

  return (
    <div className="premium-upgrade-page">

      <div className="premium-upgrade-glow"></div>

      <div className="premium-upgrade-container">

        <div className="premium-upgrade-badge">
          OVERMATHS PREMIUM
        </div>

        <h1>
          Your preparation
          <br />
          can go further.
        </h1>

        <p className="premium-upgrade-description">
          Unlock a smarter preparation experience built around
          your exam, your performance and your progress.
        </p>

        {/* Features */}

        <div className="premium-feature-grid">

          <div>
            <span>🎯</span>

            <strong>
              Personal Exam Plan
            </strong>

            <p>
              Build a preparation journey around your target exam.
            </p>
          </div>

          <div>
            <span>◈</span>

            <strong>
              Advanced Practice
            </strong>

            <p>
              Practice more questions and focus on areas that need attention.
            </p>
          </div>

          <div>
            <span>▥</span>

            <strong>
              Performance Intelligence
            </strong>

            <p>
              Understand your accuracy, progress and weak topics.
            </p>
          </div>

          <div>
            <span>⚡</span>

            <strong>
              Daily Missions
            </strong>

            <p>
              Stay consistent with structured daily preparation.
            </p>
          </div>

        </div>


        {/* Pricing */}

        <div className="premium-pricing-grid">

          <div className="premium-price-card">

            <span className="price-label">
              MONTHLY
            </span>

            <h2>
              Premium Monthly
            </h2>

            <p>
              Flexible access to the full Premium experience.
            </p>

            <button
              className="premium-upgrade-button"
              onClick={() => handleSubscribe('premium monthly')}
            >
              Subscribe Monthly
              <span>→</span>
            </button>

          </div>


          <div className="premium-price-card featured">

            <span className="price-label">
              ANNUAL
            </span>

            <h2>
              Premium Annual
            </h2>

            <p>
              Full Premium access for your entire preparation journey.
            </p>

            <button
              className="premium-upgrade-button"
              onClick={() => handleSubscribe('premium annual')}
            >
              Subscribe Annual
              <span>→</span>
            </button>

          </div>

        </div>


        <button
          className="premium-return-button"
          onClick={() => navigate('/dashboard')}
        >
          ← Return to Dashboard
        </button>

      </div>

    </div>
  )
}

export default PremiumUpgrade