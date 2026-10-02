import { supabase } from '../supabaseClient'

// ============================================================
// RENDER API
// ============================================================

// IMPORTANT:
// Replace this with your actual Render backend URL.
const API_BASE_URL =
  'https://overmaths.onrender.com'


// ============================================================
// GET SUPABASE ACCESS TOKEN
// ============================================================

async function getAccessToken() {

  if (!supabase) {
    throw new Error(
      'Supabase is not connected.'
    )
  }

  const {
    data,
    error,
  } = await supabase.auth.getSession()

  if (error) {
    console.error(
      'GET SESSION ERROR:',
      error
    )

    throw error
  }

  const session =
    data?.session

  if (!session?.access_token) {
    throw new Error(
      'Your login session is missing or has expired. Please sign in again.'
    )
  }

  return session.access_token
}


// ============================================================
// CHECK PREMIUM ACCESS THROUGH PYTHON API
// ============================================================

export async function getCurrentPremiumStatus() {

  try {

    const accessToken =
      await getAccessToken()

    console.log(
      'CHECKING PREMIUM THROUGH RENDER API'
    )

    const response =
      await fetch(
        `${API_BASE_URL}/api/auth/me`,
        {
          method: 'GET',

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            Accept:
              'application/json',
          },
        }
      )

    let result = null

    try {
      result =
        await response.json()
    } catch {
      result = null
    }

    console.log(
      'RENDER AUTH RESPONSE:',
      result
    )

    if (!response.ok) {

      return {
        isPremium: false,
        subscription: null,
        subscriptions: [],
        user: null,
        profile: null,
        error: new Error(
          result?.error ||
          'Unable to verify your account.'
        ),
      }
    }

    return {

      isPremium:
        result?.is_premium === true ||
        result?.access_level === 'premium',

      subscription:
        result?.subscription || null,

      subscriptions:
        result?.subscriptions || [],

      user:
        result?.user || null,

      profile:
        result?.profile || null,

      accessLevel:
        result?.access_level || 'normal',

      nextRoute:
        result?.next_route || '/dashboard',

      error: null,
    }

  } catch (error) {

    console.error(
      'PREMIUM STATUS ERROR:',
      error
    )

    return {
      isPremium: false,
      subscription: null,
      subscriptions: [],
      user: null,
      profile: null,
      error,
    }
  }
}


// ============================================================
// HAS PREMIUM ACCESS
// ============================================================
//
// userId is kept as an argument for compatibility with your
// existing Login.jsx:
//
//     hasPremiumAccess(profile.id)
//
// The actual authentication is handled by the Supabase session
// + Render backend.
//

export async function hasPremiumAccess(userId) {

  try {

    if (!userId) {

      return {
        isPremium: false,
        subscription: null,
        error: new Error(
          'User ID is required.'
        ),
      }
    }

    const result =
      await getCurrentPremiumStatus()

    return {

      isPremium:
        result.isPremium === true,

      subscription:
        result.subscription,

      subscriptions:
        result.subscriptions,

      user:
        result.user,

      profile:
        result.profile,

      accessLevel:
        result.accessLevel,

      nextRoute:
        result.nextRoute,

      error:
        result.error,
    }

  } catch (error) {

    console.error(
      'HAS PREMIUM ACCESS ERROR:',
      error
    )

    return {
      isPremium: false,
      subscription: null,
      error,
    }
  }
}


// ============================================================
// GET ALL USER SUBSCRIPTIONS
// ============================================================
//
// This also goes through the Render API.
// No direct subscriptions table query from the browser.
//

export async function getUserSubscriptions(userId) {

  try {

    if (!userId) {

      return {
        subscriptions: [],
        error: new Error(
          'User ID is required.'
        ),
      }
    }

    const result =
      await getCurrentPremiumStatus()

    return {

      subscriptions:
        result.subscriptions || [],

      error:
        result.error,
    }

  } catch (error) {

    console.error(
      'GET USER SUBSCRIPTIONS ERROR:',
      error
    )

    return {
      subscriptions: [],
      error,
    }
  }
}


// ============================================================
// GET PREMIUM SUBSCRIPTION
// ============================================================

export async function getPremiumSubscription(userId) {

  try {

    if (!userId) {

      return {
        subscription: null,
        error: new Error(
          'User ID is required.'
        ),
      }
    }

    const result =
      await getCurrentPremiumStatus()

    return {

      subscription:
        result.subscription || null,

      error:
        result.error,
    }

  } catch (error) {

    console.error(
      'GET PREMIUM SUBSCRIPTION ERROR:',
      error
    )

    return {
      subscription: null,
      error,
    }
  }
}