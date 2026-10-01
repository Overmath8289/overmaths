import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function PremiumRoute({ children, user, loading }) {
  const [checkingPremium, setCheckingPremium] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function checkPremiumAccess() {
      if (loading) {
        return
      }

      // No authenticated user
      if (!user) {
        if (mounted) {
          setIsPremium(false)
          setCheckingPremium(false)
        }
        return
      }

      if (!supabase) {
        if (mounted) {
          setError('Supabase is not configured.')
          setCheckingPremium(false)
        }
        return
      }

      try {
        setError('')

        // Get the Overmaths user record
        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (profileError) {
          console.error(
            'User profile lookup error:',
            profileError
          )

          throw new Error(
            'Your Overmaths profile could not be found.'
          )
        }

        if (!profile) {
          throw new Error(
            'Your Overmaths profile could not be found.'
          )
        }

        // Get latest subscription
        const {
          data: subscription,
          error: subscriptionError,
        } = await supabase
          .from('subscriptions')
          .select(
            'id, plan, started_at, expires_at, status, created_at'
          )
          .eq('user_id', profile.id)
          .order('created_at', {
            ascending: false,
          })
          .limit(1)
          .maybeSingle()

        if (subscriptionError) {
          console.error(
            'Subscription lookup error:',
            subscriptionError
          )

          throw new Error(
            'Your Premium subscription could not be verified.'
          )
        }

        // User has no subscription
        if (!subscription) {
          if (mounted) {
            setIsPremium(false)
          }
          return
        }

        const plan = subscription.plan
          ?.toString()
          .trim()
          .toLowerCase()

        const status = subscription.status
          ?.toString()
          .trim()
          .toLowerCase()

        const now = new Date()

        const startedAt = new Date(
          subscription.started_at
        )

        const expiresAt = new Date(
          subscription.expires_at
        )

        const premiumPlan =
          plan === 'premium' ||
          plan === 'premium monthly' ||
          plan === 'premium yearly' ||
          plan === 'premium annual'

        const activeStatus =
          status === 'active'

        const started =
          startedAt <= now

        const notExpired =
          expiresAt > now

        const hasPremiumAccess =
          premiumPlan &&
          activeStatus &&
          started &&
          notExpired

        console.log(
          'Premium access:',
          hasPremiumAccess
        )

        if (mounted) {
          setIsPremium(hasPremiumAccess)
        }

      } catch (err) {
        console.error(
          'PREMIUM ACCESS ERROR:',
          err
        )

        if (mounted) {
          setError(
            err.message ||
            'Unable to verify Premium access.'
          )

          setIsPremium(false)
        }

      } finally {
        if (mounted) {
          setCheckingPremium(false)
        }
      }
    }

    checkPremiumAccess()

    return () => {
      mounted = false
    }

  }, [user, loading])


  // Loading
  if (loading || checkingPremium) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#070b14',
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        Checking Premium access...
      </div>
    )
  }


  // Not authenticated
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }


  // Database/configuration error
  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#070b14',
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
          padding: '20px',
        }}
      >
        <div>
          <h2>
            Premium access unavailable
          </h2>

          <p>
            {error}
          </p>

          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '12px 20px',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }


  // Free student
  if (!isPremium) {
    return (
      <Navigate
        to="/premium-upgrade"
        replace
      />
    )
  }


  // Premium student
  return children
}

export default PremiumRoute