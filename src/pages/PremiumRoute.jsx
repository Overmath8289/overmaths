import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function PremiumRoute({ children, user, loading }) {
  const [checkingPremium, setCheckingPremium] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function checkPremiumAccess() {
      if (!user) {
        setCheckingPremium(false)
        return
      }

      try {
        setError('')

        // 1. Find the Overmaths user record
        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (profileError || !profile) {
          console.error(
            'User profile lookup error:',
            profileError
          )

          throw new Error(
            'Your Overmaths profile could not be found.'
          )
        }

        // 2. Find the user's subscription
        const {
          data: subscription,
          error: subscriptionError,
        } = await supabase
          .from('subscriptions')
          .select(
            'id, plan, started_at, expires_at, status'
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

        // No subscription
        if (!subscription) {
          setIsPremium(false)
          return
        }

        const plan =
          subscription.plan
            ?.toString()
            .trim()
            .toLowerCase()

        const status =
          subscription.status
            ?.toString()
            .trim()
            .toLowerCase()

        const now = new Date()

        const startedAt =
          new Date(subscription.started_at)

        const expiresAt =
          new Date(subscription.expires_at)

        // 3. Check subscription conditions
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

        setIsPremium(hasPremiumAccess)

      } catch (err) {
        console.error(
          'PREMIUM ACCESS ERROR:',
          err
        )

        setError(
          err.message ||
          'Unable to verify Premium access.'
        )

        setIsPremium(false)

      } finally {
        setCheckingPremium(false)
      }
    }

    if (!loading) {
      checkPremiumAccess()
    }

  }, [user, loading])

  // Checking
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

  // Not logged in
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  // Database error
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