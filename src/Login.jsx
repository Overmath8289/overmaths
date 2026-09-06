import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './Login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()

    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
    } else {
      navigate('/')
    }

    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-logo">
          <img
            src="/src/assets/overmaths-logo.png"
            alt="Overmaths Logo"
          />
        </div>

        <h1>Welcome Back</h1>

        <p>Sign in to continue practicing with Overmaths.</p>

        <form onSubmit={handleLogin}>

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

        </form>

        {message && (
          <p className="login-message">
            {message}
          </p>
        )}

        <div className="register-link">
          <p>Don't have an account?</p>

          <Link to="/register">
            Create an Account
          </Link>
        </div>

      </div>
    </div>
  )
}

export default Login