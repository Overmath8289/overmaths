import { supabase } from '../supabaseClient'


// ============================================================
// GET PREMIUM SUBSCRIPTION
// ============================================================

export async function getPremiumSubscription(userId) {

  if (!supabase) {
    return {
      subscription: null,
      error: new Error('Supabase is not connected.')
    }
  }

  if (!userId) {
    return {
      subscription: null,
      error: new Error('User ID is required.')
    }
  }

  console.log(
    'GET PREMIUM SUBSCRIPTION FOR USERS.ID:',
    userId
  )

  const {
    data,
    error
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
    .order('expires_at', {
      ascending: false
    })

  if (error) {

    console.error(
      'GET PREMIUM SUBSCRIPTION ERROR:',
      error
    )

    return {
      subscription: null,
      error
    }
  }

  console.log(
    'ALL SUBSCRIPTIONS RETURNED:',
    data
  )

  const now = new Date()

  const premiumSubscription =
    (data || []).find((subscription) => {

      const plan =
        String(
          subscription?.plan || ''
        )
          .trim()
          .toLowerCase()

      const status =
        String(
          subscription?.status || ''
        )
          .trim()
          .toLowerCase()

      const startedAt =
        subscription?.started_at
          ? new Date(subscription.started_at)
          : null

      const expiresAt =
        subscription?.expires_at
          ? new Date(subscription.expires_at)
          : null

      const premiumPlan =
        plan === 'premium' ||
        plan === 'premium monthly' ||
        plan === 'premium annual' ||
        plan === 'premium yearly' ||
        plan === 'pro' ||
        plan === 'paid'

      const active =
        status === 'active'

      const started =
        !startedAt ||
        startedAt <= now

      const notExpired =
        !expiresAt ||
        expiresAt > now

      console.log(
        'CHECKING SUBSCRIPTION:',
        {
          id: subscription?.id,
          user_id: subscription?.user_id,
          plan,
          status,
          startedAt,
          expiresAt,
          premiumPlan,
          active,
          started,
          notExpired
        }
      )

      return (
        premiumPlan &&
        active &&
        started &&
        notExpired
      )

    }) || null


  console.log(
    'PREMIUM SUBSCRIPTION FOUND:',
    premiumSubscription
  )


  return {
    subscription: premiumSubscription,
    error: null
  }
}


// ============================================================
// HAS PREMIUM ACCESS
// ============================================================

export async function hasPremiumAccess(userId) {

  console.log(
    'HAS PREMIUM ACCESS USER ID:',
    userId
  )

  if (!userId) {
    return {
      isPremium: false,
      subscription: null,
      error: new Error(
        'User ID is required.'
      )
    }
  }

  const {
    subscription,
    error
  } = await getPremiumSubscription(
    userId
  )

  if (error) {

    return {
      isPremium: false,
      subscription: null,
      error
    }
  }

  const isPremium =
    Boolean(subscription)

  console.log(
    'FINAL PREMIUM RESULT:',
    {
      isPremium,
      subscription
    }
  )

  return {
    isPremium,
    subscription,
    error: null
  }
}


// ============================================================
// GET CURRENT PREMIUM STATUS
// ============================================================

export async function getCurrentPremiumStatus() {

  if (!supabase) {

    return {
      isPremium: false,
      subscription: null,
      user: null,
      error: new Error(
        'Supabase is not connected.'
      )
    }
  }


  // ----------------------------------------------------------
  // GET AUTH USER
  // ----------------------------------------------------------

  const {
    data: authData,
    error: authError
  } =
    await supabase.auth.getUser()


  if (authError) {

    console.error(
      'CURRENT AUTH USER ERROR:',
      authError
    )

    return {
      isPremium: false,
      subscription: null,
      user: null,
      error: authError
    }
  }


  const authUser =
    authData?.user


  if (!authUser) {

    return {
      isPremium: false,
      subscription: null,
      user: null,
      error: new Error(
        'No authenticated user.'
      )
    }
  }


  console.log(
    'CURRENT AUTH USER:',
    authUser.id
  )


  // ----------------------------------------------------------
  // GET STUDENT PROFILE
  // ----------------------------------------------------------

  const {
    data: profile,
    error: profileError
  } =
    await supabase
      .from('users')
      .select(`
        id,
        auth_user_id,
        email,
        full_name,
        learning_route,
        exam_type
      `)
      .eq(
        'auth_user_id',
        authUser.id
      )
      .maybeSingle()


  if (profileError) {

    console.error(
      'CURRENT PROFILE ERROR:',
      profileError
    )

    return {
      isPremium: false,
      subscription: null,
      user: null,
      error: profileError
    }
  }


  if (!profile) {

    return {
      isPremium: false,
      subscription: null,
      user: null,
      error: new Error(
        'Student profile not found.'
      )
    }
  }


  console.log(
    'CURRENT STUDENT PROFILE:',
    profile
  )


  // ----------------------------------------------------------
  // CHECK SUBSCRIPTION
  // ----------------------------------------------------------

  const {
    subscription,
    error: subscriptionError
  } =
    await getPremiumSubscription(
      profile.id
    )


  if (subscriptionError) {

    console.error(
      'CURRENT PREMIUM CHECK ERROR:',
      subscriptionError
    )

    return {
      isPremium: false,
      subscription: null,
      user: profile,
      error: subscriptionError
    }
  }


  const isPremium =
    Boolean(subscription)


  console.log(
    'CURRENT PREMIUM STATUS:',
    isPremium
  )


  return {
    isPremium,
    subscription,
    user: profile,
    error: null
  }
}


// ============================================================
// GET ALL USER SUBSCRIPTIONS
// ============================================================

export async function getUserSubscriptions(userId) {

  if (!supabase) {

    return {
      subscriptions: [],
      error: new Error(
        'Supabase is not connected.'
      )
    }
  }


  if (!userId) {

    return {
      subscriptions: [],
      error: new Error(
        'User ID is required.'
      )
    }
  }


  const {
    data,
    error
  } =
    await supabase
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
      .eq(
        'user_id',
        userId
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      )


  if (error) {

    console.error(
      'GET USER SUBSCRIPTIONS ERROR:',
      error
    )

    return {
      subscriptions: [],
      error
    }
  }


  return {
    subscriptions: data || [],
    error: null
  }
}