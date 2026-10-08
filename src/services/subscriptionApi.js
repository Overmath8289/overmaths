import { supabase } from '../supabaseClient'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://overmaths.onrender.com'


async function getAccessToken() {
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
      'No active Supabase session.'
    )
  }

  return token
}


/*
============================================================
GET CURRENT PREMIUM STATUS
============================================================
*/

export async function getCurrentPremiumStatus() {
  const token =
    await getAccessToken()

  const response = await fetch(
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

  const payload =
    await response.json()
      .catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      payload?.error ||
      'Unable to verify account access.'
    )
  }

  return payload
}


/*
============================================================
GET CURRENT ACCESS
============================================================
*/

export async function getCurrentAccess() {
  return getCurrentPremiumStatus()
}


/*
============================================================
CHECK PREMIUM
============================================================
*/

export async function hasPremiumAccess() {
  try {
    const access =
      await getCurrentPremiumStatus()

    return {
      isPremium:
        access?.is_premium === true,

      subscription:
        access?.premium_subscription ||
        access?.subscription ||
        null,

      error: null,
    }

  } catch (error) {
    console.error(
      'Premium access check failed:',
      error
    )

    return {
      isPremium: false,
      subscription: null,
      error:
        error?.message ||
        'Unable to verify premium access.',
    }
  }
}