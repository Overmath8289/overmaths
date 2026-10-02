import { supabase } from '../supabaseClient'

/**
 * Get the current active Premium subscription
 * for a student.
 *
 * IMPORTANT:
 * subscriptions.user_id = users.id
 * NOT auth.users.id
 */
export async function getCurrentPremiumStatus(userId) {
  if (!supabase) {
    return {
      isPremium: false,
      subscription: null,
      error: new Error('Supabase is not connected.'),
    }
  }

  if (!userId) {
    return {
      isPremium: false,
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
      expires_at,
      created_at
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('plan', [
      'premium',
      'premium monthly',
      'premium annual',
      'premium yearly',
    ])
    .gt('expires_at', now)
    .order('expires_at', {
      ascending: false,
    })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error(
      'GET CURRENT PREMIUM STATUS ERROR:',
      error
    )

    return {
      isPremium: false,
      subscription: null,
      error,
    }
  }

  return {
    isPremium: Boolean(data),
    subscription: data || null,
    error: null,
  }
}


/**
 * Simple Premium check.
 *
 * Returns:
 * true  = Premium
 * false = normal/free
 */
export async function hasPremiumAccess(userId) {
  const {
    isPremium,
  } = await getCurrentPremiumStatus(userId)

  return isPremium
}


/**
 * Get all subscriptions belonging to a student.
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