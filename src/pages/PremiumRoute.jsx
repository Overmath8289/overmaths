import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getCurrentPremiumStatus } from '../services/subscriptionApi'
import './PremiumRoute.css'

function PremiumRoute() {
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkAccess() {
      try {
        const {
          isPremium,
          error,
        } = await getCurrentPremiumStatus()

        if (error) {
          console.error(
            'PREMIUM ROUTE CHECK ERROR:',
            error
          )

          if (mounted) {
            setAllowed(false)
            setChecking(false)
          }

          return
        }

        if (mounted) {
          setAllowed(isPremium)
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