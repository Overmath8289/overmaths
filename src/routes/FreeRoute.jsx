import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import {
  getCurrentPremiumStatus,
} from '../services/subscriptionApi'

function FreeRoute() {
  const [checking, setChecking] = useState(true)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkAccess() {
      const {
        isPremium: premium,
        error,
      } = await getCurrentPremiumStatus()

      if (!mounted) return

      if (error) {
        console.error(
          'FREE ROUTE PREMIUM CHECK:',
          error
        )

        /*
         * If the subscription check fails,
         * don't automatically send the user
         * somewhere unexpected.
         */
        setIsPremium(false)
        setChecking(false)

        return
      }

      setIsPremium(premium)
      setChecking(false)
    }

    checkAccess()

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
            Checking your account...
          </p>
        </div>
      </div>
    )
  }

  /*
   * IMPORTANT:
   *
   * Premium users are NEVER allowed
   * to remain on the normal dashboard.
   */
  if (isPremium) {
    return (
      <Navigate
        to="/premium"
        replace
      />
    )
  }

  return <Outlet />
}

export default FreeRoute