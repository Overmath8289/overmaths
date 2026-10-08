
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    setMessage('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setMessage('Please enter your email address and password.');
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (authError) {
        const errorMessage = String(authError.message || '').toLowerCase();

        if (
          errorMessage.includes('email not confirmed') ||
          errorMessage.includes('email_not_confirmed')
        ) {
          navigate('/verify-email', {
            replace: true,
            state: { email: cleanEmail },
          });
          return;
        }

        throw authError;
      }

      const authUser = authData?.user;

      if (!authUser) {
        throw new Error('Login could not be completed. Please try again.');
      }

      // Find the student's Overmaths profile linked to this Auth account.
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, auth_user_id, email, full_name, learning_route, exam_type')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile lookup error:', profileError);
        setMessage(
          'You are signed in, but we could not load your student profile. Please try again.'
        );
        return;
      }

      // New accounts may need to finish setting up their Overmaths profile.
      if (
        !profile ||
        !profile.full_name ||
        !profile.learning_route ||
        !profile.exam_type
      ) {
        navigate('/student-profile', { replace: true });
        return;
      }

      // Check whether the student has an active premium subscription.
      const now = new Date().toISOString();

      const { data: subscriptions, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('id, plan, status, started_at, expires_at')
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .eq('plan', 'premium')
        .gt('expires_at', now)
        .order('expires_at', { ascending: false })
        .limit(1);

      if (subscriptionError) {
        console.error('Subscription lookup error:', subscriptionError);
        // A subscription lookup problem should not block ordinary login.
        navigate('/dashboard', { replace: true });
        return;
      }

      if (subscriptions && subscriptions.length > 0) {
        navigate('/premium-dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      console.error('Login error:', error);

      setMessage(
        error?.message ||
          'Unable to log in. Please check your details and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setMessage('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setMessage('Enter your email address first, then select Forgot password.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setMessage('If the email is registered, a password reset link has been requested. Check your inbox and spam folder.');
    } catch (error) {
      console.error('Password reset error:', error);
      setMessage(
        error?.message || 'Unable to request a password reset. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <header className="login-header">
          <Link to="/" className="login-brand">
            Overmaths
          </Link>

          <h1>Welcome back</h1>
          <p>Log in to continue your learning journey.</p>
        </header>

        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label htmlFor="loginEmail">Email address</label>
            <input
              id="loginEmail"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label htmlFor="loginPassword">Password</label>

            <div className="login-input-wrapper">
              <input
                id="loginPassword"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="login-options">
            <button
              type="button"
              className="forgot-password"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              Forgot password?
            </button>
          </div>

          {message && (
            <p className="login-message" role="alert">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="login-footer">
          Don’t have an account? <Link to="/register">Create one</Link>
        </p>

        <p className="login-verification-link">
          Need to verify your email?{' '}
          <Link
            to="/verify-email"
            state={{ email: email.trim().toLowerCase() }}
          >
            Go to verification
          </Link>
        </p>
      </section>
    </main>
  );
}