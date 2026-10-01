import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5050'

function PremiumRoute({
  children,
  user,
  loading,
}) {
  const [checkingPremium, setCheckingPremium] =
    useState(true)

  const [isPremium, setIsPremium] =
    useState(false)

  const [error, setError] =
    useState('')

  useEffect(() => {

    async function checkPremium() {

      if (!user) {

        setCheckingPremium(false)

        return
      }

      try {

        setError('')

        const response = await fetch(
          `${API_URL}/api/dashboard/access?user_id=${encodeURIComponent(user.id)}`
        )

        const data = await response.json()

        if (!response.ok || !data.success) {

          throw new Error(
            data.error ||
            'Unable to verify Premium access.'
          )
        }

        setIsPremium(
          data.access?.is_premium === true
        )

      } catch (error) {

        console.error(
          'Premium access error:',
          error
        )

        setError(
          error.message ||
          'Unable to verify Premium access.'
        )

        setIsPremium(false)

      } finally {

        setCheckingPremium(false)
      }
    }

    if (!loading) {

      checkPremium()
    }

  }, [user, loading])


  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading ||
    checkingPremium
  ) {

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


  // ==========================================================
  // NOT LOGGED IN
  // ==========================================================

  if (!user) {

    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }


  // ==========================================================
  // ERROR
  // ==========================================================

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
          textAlign: 'center',
          padding: '30px',
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


  // ==========================================================
  // FREE USER
  // ==========================================================

  if (!isPremium) {

    return (
      <Navigate
        to="/premium-upgrade"
        replace
      />
    )
  }


  // ==========================================================
  // PREMIUM USER
  // ==========================================================

  return children
}

export default PremiumRoute