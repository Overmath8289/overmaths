import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function PremiumRoute() {
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkPremiumAccess() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          if (mounted) {
            setAllowed(false)
            setChecking(false)
          }

          return
        }

        const { data: userProfile, error: userError } =
          await supabase
            .from('users')
            .select('id')
            .eq(
              'auth_user_id',
              session.user.id
            )
            .single()

        if (userError || !userProfile) {
          console.error(
            'Premium profile error:',
            userError
          )

          if (mounted) {
            setAllowed(false)
            setChecking(false)
          }

          return
        }

        const {
          data: subscriptions,
          error: subscriptionError,
        } = await supabase
          .from('subscriptions')
          .select(
            'id, plan, started_at, expires_at, status, created_at'
          )
          .eq(
            'user_id',
            userProfile.id
          )
          .order('created_at', {
            ascending: false,
          })

        if (subscriptionError) {
          console.error(
            'Premium subscription error:',
            subscriptionError
          )

          if (mounted) {
            setAllowed(false)
            setChecking(false)
          }

          return
        }

        const now = new Date()

        const hasPremium =
          (subscriptions || []).some((subscription) => {
            const plan = String(
              subscription?.plan || ''
            )
              .trim()
              .toLowerCase()

            const status = String(
              subscription?.status || ''
            )
              .trim()
              .toLowerCase()

            const premiumPlan =
              plan === 'premium' ||
              plan === 'premium monthly' ||
              plan === 'premium yearly' ||
              plan === 'premium annual'

            if (!premiumPlan) {
              return false
            }

            if (status !== 'active') {
              return false
            }

            if (subscription.started_at) {
              const startedAt =
                new Date(
                  subscription.started_at
                )

              if (
                !Number.isNaN(
                  startedAt.getTime()
                ) &&
                startedAt > now
              ) {
                return false
              }
            }

            if (subscription.expires_at) {
              const expiresAt =
                new Date(
                  subscription.expires_at
                )

              if (
                !Number.isNaN(
                  expiresAt.getTime()
                ) &&
                expiresAt <= now
              ) {
                return false
              }
            }

            return true
          })

        if (mounted) {
          setAllowed(hasPremium)
          setChecking(false)
        }
      } catch (error) {
        console.error(
          'Premium route error:',
          error
        )

        if (mounted) {
          setAllowed(false)
          setChecking(false)
        }
      }
    }

    checkPremiumAccess()

    return () => {
      mounted = false
    }
  }, [])

  if (checking) {
    return (
      <div className="dashboard-page dashboard-loading">
        <div className="dashboard-loader">
          <div className="loader-orb"></div>

          <p>
            Verifying Premium access...
          </p>
        </div>
      </div>
    )
  }

  if (!allowed) {
    return (
      <Navigate
        to="/premium-upgrade"
        replace
      />
    )
  }

  return <Outlet />
}

export default PremiumRoute