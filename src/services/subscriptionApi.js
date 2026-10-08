import { supabase } from '../supabaseClient'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://overmaths.onrender.com'


// ============================================================
// GET CURRENT SUPABASE ACCESS TOKEN
// ============================================================

async function getAccessToken() {

  if (!supabase) {
    throw new Error(
      'Supabase is not available.'
    )
  }

  const {
    data,
    error,
  } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  const token =
    data?.session?.access_token

  if (!token) {
    throw new Error(
      'No active authentication session.'
    )
  }

  return token
}


// ============================================================
// GET CURRENT USER ACCESS FROM PYTHON
// ============================================================
//
// IMPORTANT:
//
// The frontend does NOT query:
//
// users
// subscriptions
//
// directly for access decisions.
//
// Python is the authority.
//
// ============================================================

export async function getCurrentAccess() {

  const token =
    await getAccessToken()

  const response =
    await fetch(
      `${API_BASE_URL}/api/auth/me`,
      {
        method: 'GET',

        headers: {
          Authorization:
            `Bearer ${token}`,

          'Content-Type':
            'application/json',
        },
      }
    )

  const data =
    await response
      .json()
      .catch(() => ({}))

  if (!response.ok) {

    throw new Error(
      data?.error ||
      'Unable to verify account access.'
    )
  }

  return data
}


// ============================================================
// ALIAS
// ============================================================

export async function getUserAccess() {

  return getCurrentAccess()

}


// ============================================================
// PREMIUM ACCESS
// ============================================================
//
// Kept for compatibility with any other component
// that already imports hasPremiumAccess().
//
// The actual decision still comes from Python.
//
// ============================================================

export async function hasPremiumAccess(
  _userId
) {

  const access =
    await getCurrentAccess()

  return {

    isPremium:
      access?.is_premium === true,

    subscription:
      access?.premium_subscription ||
      null,

    error: null,

  }

}


// ============================================================
// GET ALL SUBSCRIPTIONS
// ============================================================
//
// Returned by Python, not queried directly from Supabase.
//
// ============================================================

export async function getUserSubscriptions() {

  const access =
    await getCurrentAccess()

  return (
    Array.isArray(
      access?.subscriptions
    )
      ? access.subscriptions
      : []
  )

}


// ============================================================
// GET PREMIUM SUBSCRIPTION
// ============================================================

export async function getPremiumSubscription() {

  const access =
    await getCurrentAccess()

  return (
    access?.premium_subscription ||
    null
  )

}