
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import logo from './assets/overmaths-logo.png';
import './VerifyEmail.css';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(
    location.state?.email || ''
  );
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [loading, setLoading] = useState(false);

  // Keep the email current if the user arrives here from another page.
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state?.email]);

  // Supabase may establish a session after the user opens the
  // confirmation link. Detect that event and continue to the profile.
  useEffect(() => {
    let active = true;

    const goToProfile = () => {
      if (active) {
        navigate('/student-profile', { replace: true });
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        active &&
        session?.user?.email_confirmed_at &&
        ['SIGNED_IN', 'USER_UPDATED', 'INITIAL_SESSION'].includes(event)
      ) {
        goToProfile();
      }
    });

    // Also check an existing session in case confirmation completed
    // before this component mounted.
    supabase.auth.getUser().then(({ data, error }) => {
      if (
        active &&
        !error &&
        data?.user?.email_confirmed_at
      ) {
        goToProfile();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  async function handleResend(event) {
    event.preventDefault();
    setMessage('');
    setMessageType('info');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setMessage('Enter the email address you used to register.');
      setMessageType('error');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      });

      if (error) {
        throw error;
      }

      setMessage(
        'A verification email has been requested. Check your inbox and spam folder. If it does not arrive, please try again later.'
      );
      setMessageType('success');
    } catch (error) {
      console.error('Resend verification error:', error);

      setMessage(
        error?.message ||
          'We could not request another verification email. Please try again later.'
      );
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="verify-page">
      <div className="verify-glow verify-glow-one" aria-hidden="true" />
      <div className="verify-glow verify-glow-two" aria-hidden="true" />

      <main className="verify-container">
        <div className="verify-brand-top">
          <Link to="/" aria-label="Overmaths home">
            <img src={logo} alt="Overmaths logo" />
          </Link>
          <span>Smart Exam Practice</span>
        </div>

        <section className="verify-panel">
          <div className="verify-success-icon" aria-hidden="true">
            <span>✉</span>
          </div>

          <div className="verify-eyebrow">
            ACCOUNT VERIFICATION
          </div>

          <h1>Check your email</h1>

          <p className="verify-main-text">
            You're one step away from starting your Overmaths learning
            journey.
          </p>

          <p className="verify-description">
            Open the verification email from Supabase and click its link
            to activate your account. If you have not received it, you
            can request another one below.
          </p>

          <form onSubmit={handleResend}>
            <div className="register-field">
              <label htmlFor="verification-email">
                Registration email
              </label>

              <input
                id="verification-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email address"
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            {message && (
              <p
                className={`verify-message ${messageType}`}
                role="status"
                aria-live="polite"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              className="verify-login-btn"
              disabled={loading}
            >
              {loading
                ? 'Requesting email...'
                : 'Resend verification email'}
            </button>
          </form>

          <Link to="/login" className="verify-login-btn verify-secondary-btn">
            Continue to Sign In →
          </Link>

          <div className="verify-help">
            <div className="verify-help-icon" aria-hidden="true">
              ?
            </div>

            <div>
              <strong>Still no email?</strong>
              <p>
                Check your spam or junk folder and confirm that the
                address is correct. If no email arrives, your Supabase
                email provider or sending limits may need attention.
              </p>
            </div>
          </div>

          <Link to="/register" className="verify-back-link">
            ← Back to Create Account
          </Link>
        </section>

        <footer className="verify-footer">
          © {new Date().getFullYear()} Overmaths
          <span>•</span>
          Smart Exam Practice
        </footer>
      </main>
    </div>
  );
}