import { supabase } from '../supabaseClient'

/**
 * Get the current authenticated student's database profile.
 *
 * Auth UUID:
 * auth.users.id
 *
 * Database profile:
 * users.id
 */
export async function getCurrentStudentProfile() {
  if (!supabase) {
    return {
      profile: null,
      error: new Error('Supabase is not connected.'),
    }
  }

  const {
    data: {
      user: authUser,
    },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    return {
      profile: null,
      error: authError,
    }
  }

  if (!authUser) {
    return {
      profile: null,
      error: new Error('No authenticated user.'),
    }
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('users')
    .select(`
      id,
      auth_user_id,
      email,
      full_name,
      learning_route,
      exam_type
    `)
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (profileError) {
    console.error(
      'GET STUDENT PROFILE ERROR:',
      profileError
    )

    return {
      profile: null,
      error: profileError,
    }
  }

  if (!profile) {
    return {
      profile: null,
      error: new Error('Student profile not found.'),
    }
  }

  return {
    profile,
    error: null,
  }
}


/**
 * Get active Premium subscription.
 *
 * IMPORTANT:
 * subscriptions.user_id = users.id
 *
 * It does NOT use auth.users.id.
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
      error: new Error('Database user ID is required.'),
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

  const premiumSubscription =
    (data || []).find((subscription) => {
      const plan = String(
        subscription?.plan || ''
      )
        .trim()
        .toLowerCase()

      return (
        plan === 'premium' ||
        plan === 'premium monthly' ||
        plan === 'premium annual' ||
        plan === 'premium yearly'
      )
    }) || null

  return {
    subscription: premiumSubscription,
    error: null,
  }
}


/**
 * Check Premium access.
 */
export async function hasPremiumAccess(userId) {
  const {
    subscription,
    error,
  } = await getPremiumSubscription(userId)

  return {
    isPremium: Boolean(subscription),
    subscription,
    error,
  }
}


/**
 * Get the current student's Premium status.
 *
 * This is useful for PremiumUpgrade.jsx.
 */
export async function getCurrentPremiumStatus() {
  const {
    profile,
    error: profileError,
  } = await getCurrentStudentProfile()

  if (profileError) {
    return {
      profile: null,
      isPremium: false,
      subscription: null,
      error: profileError,
    }
  }

  const {
    isPremium,
    subscription,
    error: subscriptionError,
  } = await hasPremiumAccess(profile.id)

  return {
    profile,
    isPremium,
    subscription,
    error: subscriptionError,
  }
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