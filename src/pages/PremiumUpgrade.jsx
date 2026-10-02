import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCurrentPremiumStatus,
} from './services/subscriptionApi'
import './PremiumUpgrade.css'

function PremiumUpgrade() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadPremiumStatus() {
      try {
        const {
          isPremium: premiumStatus,
          subscription: currentSubscription,
          error,
        } = await getCurrentPremiumStatus()

        if (!mounted) return

        if (error) {
          console.error(
            'PREMIUM STATUS ERROR:',
            error
          )

          setMessage(
            'We could not check your Premium status.'
          )

          setLoading(false)

          return
        }

        setIsPremium(premiumStatus)
        setSubscription(currentSubscription)
        setLoading(false)
      } catch (error) {
        console.error(
          'PREMIUM PAGE ERROR:',
          error
        )

        if (mounted) {
          setMessage(
            'Unable to load Premium information.'
          )

          setLoading(false)
        }
      }
    }

    loadPremiumStatus()

    return () => {
      mounted = false
    }
  }, [])

  const handleSubscribe = (plan) => {
    console.log(
      'Selected Premium plan:',
      plan
    )

    /*
      PAYMENT FLOW WILL GO HERE.

      Example:

      1. Create payment
      2. Send payment to payment provider
      3. Verify payment
      4. Create/update subscriptions row
      5. Refresh Premium status
      6. Navigate to /premium
    */

    setMessage(
      `You selected ${plan}. Payment integration will be connected next.`
    )
  }

  const formatDate = (date) => {
    if (!date) return ''

    const parsedDate = new Date(date)

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return ''
    }

    return parsedDate.toLocaleDateString(
      'en-NG',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
    )
  }

  if (loading) {
    return (
      <div className="premium-upgrade-page">
        <div className="premium-upgrade-container">
          <div className="premium-upgrade-badge">
            OVERMATHS PREMIUM
          </div>

          <h1>
            Checking your Premium status...
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div className="premium-upgrade-page">

      <div className="premium-upgrade-glow"></div>

      <div className="premium-upgrade-container">

        {/* =====================================================
            STATUS
        ===================================================== */}

        {isPremium ? (
          <>
            <div className="premium-upgrade-badge">
              PREMIUM MEMBER
            </div>

            <h1>
              Your Premium access
              <br />
              is active.
            </h1>

            <p className="premium-upgrade-description">
              You already have access to the full
              Overmaths Premium experience.
            </p>

            {subscription?.expires_at && (
              <div className="premium-current-subscription">

                <strong>
                  Current subscription
                </strong>

                <span>
                  {subscription.plan}
                </span>

                <small>
                  Expires on{' '}
                  {formatDate(
                    subscription.expires_at
                  )}
                </small>

              </div>
            )}

            <div className="premium-existing-actions">

              <button
                className="premium-upgrade-button"
                onClick={() =>
                  navigate('/premium')
                }
              >
                Go to Premium
                <span>→</span>
              </button>

              <button
                className="premium-return-button"
                onClick={() =>
                  navigate('/dashboard')
                }
              >
                ← Return to Dashboard
              </button>

            </div>

            <div className="premium-renewal-heading">
              Renew or extend your Premium
            </div>
          </>
        ) : (
          <>
            <div className="premium-upgrade-badge">
              OVERMATHS PREMIUM
            </div>

            <h1>
              Your preparation
              <br />
              can go further.
            </h1>

            <p className="premium-upgrade-description">
              Unlock a smarter preparation experience
              built around your exam, your performance
              and your progress.
            </p>
          </>
        )}

        {/* =====================================================
            MESSAGE
        ===================================================== */}

        {message && (
          <div className="premium-upgrade-message">
            {message}
          </div>
        )}

        {/* =====================================================
            FEATURES
        ===================================================== */}

        <div className="premium-feature-grid">

          <div>
            <span>🎯</span>

            <strong>
              Personal Exam Plan
            </strong>

            <p>
              Build a preparation journey around
              your target exam.
            </p>
          </div>

          <div>
            <span>◈</span>

            <strong>
              Advanced Practice
            </strong>

            <p>
              Practice more questions and focus
              on areas that need attention.
            </p>
          </div>

          <div>
            <span>▥</span>

            <strong>
              Performance Intelligence
            </strong>

            <p>
              Understand your accuracy, progress
              and weak topics.
            </p>
          </div>

          <div>
            <span>⚡</span>

            <strong>
              Daily Missions
            </strong>

            <p>
              Stay consistent with structured
              daily preparation.
            </p>
          </div>

        </div>

        {/* =====================================================
            PRICING
        ===================================================== */}

        <div className="premium-pricing-grid">

          {/* MONTHLY */}

          <div className="premium-price-card">

            <span className="price-label">
              MONTHLY
            </span>

            <h2>
              Premium Monthly
            </h2>

            <p>
              Flexible access to the full
              Premium experience.
            </p>

            <button
              className="premium-upgrade-button"
              onClick={() =>
                handleSubscribe(
                  'premium monthly'
                )
              }
            >
              {isPremium
                ? 'Renew Monthly'
                : 'Subscribe Monthly'}

              <span>
                →
              </span>
            </button>

          </div>

          {/* ANNUAL */}

          <div className="premium-price-card featured">

            <span className="price-label">
              ANNUAL
            </span>

            <h2>
              Premium Annual
            </h2>

            <p>
              Full Premium access for your
              entire preparation journey.
            </p>

            <button
              className="premium-upgrade-button"
              onClick={() =>
                handleSubscribe(
                  'premium annual'
                )
              }
            >
              {isPremium
                ? 'Renew Annual'
                : 'Subscribe Annual'}

              <span>
                →
              </span>
            </button>

          </div>

        </div>

        {/* =====================================================
            RETURN
        ===================================================== */}

        <button
          className="premium-return-button"
          onClick={() =>
            navigate('/dashboard')
          }
        >
          ← Return to Dashboard
        </button>

      </div>

    </div>
  )
}

export default PremiumUpgrade