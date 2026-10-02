import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import {
  getCurrentPremiumStatus,
} from '../services/subscriptionApi'
import './PremiumUpgrade.css'

function PremiumUpgrade() {
  const navigate = useNavigate()

  const [checking, setChecking] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [subscription, setSubscription] = useState(null)

  // ============================================================
  // CHECK CURRENT USER'S PREMIUM STATUS
  // ============================================================

  useEffect(() => {
    let mounted = true

    async function checkPremiumStatus() {
      try {
        // --------------------------------------------------------
        // 1. GET CURRENT LOGIN SESSION
        // --------------------------------------------------------

        const {
          data: {
            session,
          },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          if (mounted) {
            setChecking(false)
          }

          return
        }

        console.log(
          'PREMIUM UPGRADE - AUTH USER:',
          session.user.id
        )

        // --------------------------------------------------------
        // 2. GET DATABASE USER
        //
        // auth.users.id
        //       ↓
        // users.auth_user_id
        //       ↓
        // users.id
        //       ↓
        // subscriptions.user_id
        // --------------------------------------------------------

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from('users')
          .select('id')
          .eq(
            'auth_user_id',
            session.user.id
          )
          .maybeSingle()

        if (profileError) {
          console.error(
            'PREMIUM UPGRADE PROFILE ERROR:',
            profileError
          )

          if (mounted) {
            setChecking(false)
          }

          return
        }

        if (!profile) {
          console.log(
            'No database profile found.'
          )

          if (mounted) {
            setChecking(false)
          }

          return
        }

        console.log(
          'PREMIUM UPGRADE DATABASE USER:',
          profile.id
        )

        // --------------------------------------------------------
        // 3. CHECK PREMIUM SUBSCRIPTION
        // --------------------------------------------------------

        const result =
          await getCurrentPremiumStatus(
            profile.id
          )

        console.log(
          'PREMIUM UPGRADE STATUS:',
          result
        )

        if (mounted) {
          setIsPremium(
            result.isPremium
          )

          setSubscription(
            result.subscription
          )

          setChecking(false)
        }

      } catch (error) {
        console.error(
          'PREMIUM UPGRADE CHECK ERROR:',
          error
        )

        if (mounted) {
          setChecking(false)
        }
      }
    }

    checkPremiumStatus()

    return () => {
      mounted = false
    }
  }, [])

  // ============================================================
  // SUBSCRIBE
  // ============================================================

  const handleSubscribe = (plan) => {
    console.log(
      'SELECTED PREMIUM PLAN:',
      plan
    )

    /*
      PAYMENT WILL BE CONNECTED HERE.

      Future flow:

      1. Create payment
      2. Redirect to payment provider
      3. Verify payment
      4. Create/update subscription
      5. Redirect to /premium
    */

    if (isPremium) {
      navigate('/premium', {
        replace: true,
      })

      return
    }

    console.log(
      'FREE STUDENT SELECTED:',
      plan
    )
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (checking) {
    return (
      <div className="premium-upgrade-page">

        <div className="premium-upgrade-container">

          <div className="premium-upgrade-badge">
            OVERMATHS PREMIUM
          </div>

          <h1>
            Checking your Premium status...
          </h1>

          <p className="premium-upgrade-description">
            Please wait while we verify your account.
          </p>

        </div>

      </div>
    )
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="premium-upgrade-page">

      <div className="premium-upgrade-glow"></div>

      <div className="premium-upgrade-container">

        {/* ======================================================
            BADGE
        ====================================================== */}

        <div className="premium-upgrade-badge">
          OVERMATHS PREMIUM
        </div>

        {/* ======================================================
            HEADING
        ====================================================== */}

        <h1>
          Your preparation
          <br />
          can go further.
        </h1>

        <p className="premium-upgrade-description">
          Unlock a smarter preparation experience built around
          your exam, your performance and your progress.
        </p>

        {/* ======================================================
            PREMIUM STUDENT STATUS
        ====================================================== */}

        {isPremium && (
          <div className="premium-current-status">

            <div className="premium-current-status-badge">
              ✓ PREMIUM ACTIVE
            </div>

            <h2>
              You are already a Premium student.
            </h2>

            <p>
              Your Premium access is currently active.
              You do not need to subscribe again.
            </p>

            {subscription?.expires_at && (
              <p className="premium-expiry">

                Premium access expires on{' '}

                <strong>
                  {new Date(
                    subscription.expires_at
                  ).toLocaleDateString()}
                </strong>

              </p>
            )}

            <button
              className="premium-upgrade-button"
              onClick={() =>
                navigate('/premium')
              }
            >
              Continue to Premium
              <span>→</span>
            </button>

          </div>
        )}

        {/* ======================================================
            FEATURES
        ====================================================== */}

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

        {/* ======================================================
            PRICING
            ONLY SHOW SUBSCRIPTION OPTIONS TO FREE STUDENTS
        ====================================================== */}

        {!isPremium && (
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
                Subscribe Monthly

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
                Subscribe Annual

                <span>
                  →
                </span>
              </button>

            </div>

          </div>
        )}

        {/* ======================================================
            RETURN BUTTON
        ====================================================== */}

        <button
          className="premium-return-button"
          onClick={() =>
            navigate(
              isPremium
                ? '/premium'
                : '/dashboard'
            )
          }
        >
          ←{' '}
          {isPremium
            ? 'Return to Premium'
            : 'Return to Dashboard'}
        </button>

      </div>

    </div>
  )
}

export default PremiumUpgrade