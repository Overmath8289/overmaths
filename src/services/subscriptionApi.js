import { supabase } from '../supabaseClient'

/**
 * Get the active premium subscription for a student.
 *
 * IMPORTANT:
 * subscriptions.user_id references users.id,
 * NOT auth.users.id.
 */
export async function getPremiumSubscription(userId) {
   if (!supabase) {
    return {
      subscription: null,
      error: new Error('Supabase is not connected.'),
    }
  }

  if (!userId) {
    return {
      subscription: null,
      error: new Error('User ID is required.'),
    }
  }

  const now = new Date().toISOString()

  const {
    data,
    error,
  } = await supabase
    .from('subscriptions')
    .select(`
      id,
      user_id,
      plan,
      status,
      started_at,
      expires_at
    `)
    .eq('user_id', userId)
    .eq('plan', 'premium')
    .eq('status', 'active')
    .gt('expires_at', now)
    .order('expires_at', {
      ascending: false,
    })
    .limit(1)

  if (error) {
    console.error(
      'GET PREMIUM SUBSCRIPTION ERROR:',
      error
    )

    return {
      subscription: null,
      error,
    }
  }

  return {
    subscription: data?.[0] || null,
    error: null,
  }
}


/**
 * Check whether a student currently has premium access.
 *
 * Returns:
 *
 * {
 *   isPremium: true/false,
 *   subscription: object/null,
 *   error: null/error
 * }
 */
export async function hasPremiumAccess(userId) {
  const {
    subscription,
    error,
  } = await getPremiumSubscription(userId)

  if (error) {
    return {
      isPremium: false,
      subscription: null,
      error,
    }
  }

  return {
    isPremium: Boolean(subscription),
    subscription,
    error: null,
  }
}


/**
 * Get all subscriptions belonging to a student.
 *
 * Useful for:
 * - Subscription page
 * - Payment history
 * - Account pages
 * - Admin dashboard
 * - Debugging
 */
export async function getUserSubscriptions(userId) {
  if (!supabase) {
    return {
      subscriptions: [],
      error: new Error('Supabase is not connected.'),
    }
  }

  if (!userId) {
    return {
      subscriptions: [],
      error: new Error('User ID is required.'),
    }
  }

  const {
    data,
    error,
  } = await supabase
    .from('subscriptions')
    .select(`
      id,
      user_id,
      plan,
      status,
      started_at,
      expires_at,
      created_at
    `)
    .eq('user_id', userId)
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    console.error(
      'GET USER SUBSCRIPTIONS ERROR:',
      error
    )

    return {
      subscriptions: [],
      error,
    }
  }

  return {
    subscriptions: data || [],
    error: null,
  }
}