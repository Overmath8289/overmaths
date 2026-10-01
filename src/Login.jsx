const handleLogin = async (e) => {
  e.preventDefault()
  setMessage('')

  if (!email.trim() || !password) {
    setMessage('Please enter your email and password.')
    return
  }

  if (!supabase) {
    setMessage(
      'Login is available on the live Overmaths website. Local testing is currently running without Supabase.'
    )
    return
  }

  setLoading(true)

  try {
    // =====================================================
    // 1. AUTHENTICATE
    // =====================================================

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setMessage(authError.message)
      return
    }

    const authUser = authData?.user

    if (!authUser) {
      setMessage(
        'Login was unsuccessful. Please try again.'
      )
      return
    }

    // =====================================================
    // 2. GET STUDENT PROFILE
    // =====================================================

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
        path,
        exam_type,
        subject,
        course
      `)
      .eq('auth_user_id', authUser.id)
      .maybeSingle()

    if (profileError) {
      console.error('PROFILE ERROR:', profileError)

      setMessage(
        'We could not load your student profile. Please try again.'
      )

      return
    }

    // =====================================================
    // 3. CHECK PROFILE COMPLETION
    // =====================================================

    const hasFullName =
      Boolean(profile?.full_name?.trim())

    const hasPath =
      Boolean(profile?.path)

    const hasExamType =
      profile?.path === 'university'
        ? true
        : Boolean(profile?.exam_type)

    const hasSubject =
      Boolean(profile?.subject)

    const hasCourse =
      profile?.path === 'university'
        ? Boolean(profile?.course)
        : true

    const profileComplete =
      profile &&
      hasFullName &&
      hasPath &&
      hasExamType &&
      hasSubject &&
      hasCourse

    // =====================================================
    // 4. PROFILE NOT COMPLETE
    // =====================================================

    if (!profileComplete) {
      navigate('/student-profile', {
        replace: true,
      })

      return
    }

    // =====================================================
    // 5. CHECK PREMIUM SUBSCRIPTION
    // =====================================================

    const now = new Date().toISOString()

    const {
      data: subscription,
      error: subscriptionError,
    } = await supabase
      .from('subscriptions')
      .select(`
        id,
        plan,
        status,
        started_at,
        expires_at
      `)
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .eq('plan', 'premium')
      .gt('expires_at', now)
      .order('expires_at', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

    if (subscriptionError) {
      console.error(
        'SUBSCRIPTION ERROR:',
        subscriptionError
      )

      navigate('/dashboard', {
        replace: true,
      })

      return
    }

    // =====================================================
    // 6. FINAL DESTINATION
    // =====================================================

    if (subscription) {
      navigate('/premium', {
        replace: true,
      })

      return
    }

    navigate('/dashboard', {
      replace: true,
    })

  } catch (error) {
    console.error('LOGIN ERROR:', error)

    setMessage(
      error?.message ||
        'Something went wrong while signing in. Please try again.'
    )
  } finally {
    setLoading(false)
  }
}


export default Login