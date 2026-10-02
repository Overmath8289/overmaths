import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { hasPremiumAccess } from '../services/subscriptionApi'
import './PremiumRoute.css'

function PremiumRoute() {
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkPremiumAccess() {
      try {
        // ============================================
        // 1. GET CURRENT AUTH USER
        // ============================================

        const {
          data: {
            session,
          },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          if (mounted) {
            setAllowed(false)
            setChecking(false)
          }

          return
        }

        // ============================================
        // 2. GET DATABASE USER PROFILE
        // ============================================

        const {
          data: userProfile,
          error: userError,
        } = await supabase
          .from('users')
          .select('id')
          .eq(
            'auth_user_id',
            session.user.id
          )
          .maybeSingle()

        if (userError) {
          console.error(
            'PREMIUM PROFILE ERROR:',
            userError
          )

          if (mounted) {
            setAllowed(false)
            setChecking(false)
          }

          return
        }

        if (!userProfile) {
          if (mounted) {
            setAllowed(false)
            setChecking(false)
          }

          return
        }

        // ============================================
        // 3. CHECK PREMIUM
        //
        // subscriptions.user_id = users.id
        // ============================================

        const premium =
          await hasPremiumAccess(
            userProfile.id
          )

        console.log(
          'PREMIUM ROUTE CHECK:',
          {
            userId: userProfile.id,
            premium,
          }
        )

        if (mounted) {
          setAllowed(premium)
          setChecking(false)
        }

      } catch (error) {
        console.error(
          'PREMIUM ROUTE ERROR:',
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

  // ================================================
  // CHECKING
  // ================================================

  if (checking) {
    return (
      <div className="premium-route-loading">

        <div className="premium-route-loader">

          <div className="premium-loader-orb"></div>

          <p>
            Verifying Premium access...
          </p>

        </div>

      </div>
    )
  }

  // ================================================
  // NOT PREMIUM
  // ================================================

  if (!allowed) {
    return (
      <Navigate
        to="/premium-upgrade"
        replace
      />
    )
  }

  // ================================================
  // PREMIUM
  // ================================================

  return <Outlet />
}

export default PremiumRoute