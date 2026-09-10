import { supabase } from './supabaseClient'

const INACTIVITY_LIMIT = 30 * 60 * 1000 // 30 minutes

let inactivityTimer = null
let activityHandler = null

export async function getCurrentUser() {
  if (!supabase) {
    return null
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error('Authentication error:', error)
    return null
  }

  return user || null
}

export async function signOutUser() {
  stopInactivityTimer()

  if (!supabase) {
    return
  }

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Logout error:', error)
    throw error
  }
}

function resetInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer)
  }

  inactivityTimer = setTimeout(async () => {
    try {
      await signOutUser()

      window.location.href = '/login?reason=timeout'
    } catch (error) {
      console.error('Automatic logout error:', error)
      window.location.href = '/login?reason=timeout'
    }
  }, INACTIVITY_LIMIT)
}

export function startInactivityTimer() {
  if (!supabase) {
    return
  }

  stopInactivityTimer()

  activityHandler = () => {
    resetInactivityTimer()
  }

  const events = [
    'mousemove',
    'mousedown',
    'keydown',
    'scroll',
    'touchstart',
    'click',
  ]

  events.forEach((event) => {
    window.addEventListener(event, activityHandler)
  })

  resetInactivityTimer()
}

export function stopInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer)
    inactivityTimer = null
  }

  if (activityHandler) {
    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ]

    events.forEach((event) => {
      window.removeEventListener(event, activityHandler)
    })

    activityHandler = null
  }
}