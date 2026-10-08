
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './Register.css';

export default function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const passwordRules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const passwordIsValid = Object.values(passwordRules).every(Boolean);

  const handleRegister = async (event) => {
    event.preventDefault();
    setMessage('');
    setMessageType('error');

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanReferralCode = referralCode.trim();

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      setMessage('Please complete all required fields.');
      return;
    }

    if (!passwordIsValid) {
      setMessage(
        'Your password must have at least 8 characters, an uppercase letter, a lowercase letter, and a number.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Your passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            full_name: cleanName,
            referral_code: cleanReferralCode || null,
          },
        },
      });

      if (error) {
        throw error;
      }

      // Keep the email for the verification screen.
      setRegisteredEmail(cleanEmail);
      setRegistered(true);
      setMessage(
        data?.user?.identities?.length === 0
          ? 'An account may already exist with this email. Try logging in or request a new verification email.'
          : 'Registration submitted. Check your email for the verification link.'
      );
      setMessageType('success');

      // Clear the password fields, but retain the email for verification.
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Registration error:', error);
      setMessage(
        error?.message || 'Unable to create your account. Please try again.'
      );
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <main className="register-page">
        <section className="register-panel">
          <div className="register-success">
            <div className="success-icon" aria-hidden="true">
              ✉️
            </div>

            <h1>Check your email</h1>

            <p className="register-message success">
              {message}
            </p>

            <p>
              We sent a verification link to:
            </p>

            <strong className="registered-email">
              {registeredEmail}
            </strong>

            <p>
              Open the email and click the verification link. If you cannot
              find it, check your spam or junk folder.
            </p>

            <button
              type="button"
              className="register-submit"
              onClick={() =>
                navigate('/verify-email', {
                  state: { email: registeredEmail },
                })
              }
            >
              Continue to Verification <span>→</span>
            </button>

            <p className="register-footer">
              Already verified your email?{' '}
              <Link to="/login">Log in</Link>
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="register-page">
      <section className="register-panel">
        <header className="register-header">
          <Link to="/" className="register-brand">
            Overmaths
          </Link>

          <h1>Create your account</h1>
          <p>Join Overmaths and start your learning journey.</p>
        </header>

        <form onSubmit={handleRegister} noValidate>
          <div className="register-field">
            <label htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="register-field">
            <label htmlFor="registerEmail">Email address</label>
            <input
              id="registerEmail"
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

          <div className="register-field">
            <label htmlFor="registerPassword">Password</label>
            <div className="input-shell">
              <input
                id="registerPassword"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Create a strong password"
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

            <ul className="password-rules">
              <li className={passwordRules.length ? 'valid' : ''}>
                At least 8 characters
              </li>
              <li className={passwordRules.uppercase ? 'valid' : ''}>
                One uppercase letter
              </li>
              <li className={passwordRules.lowercase ? 'valid' : ''}>
                One lowercase letter
              </li>
              <li className={passwordRules.number ? 'valid' : ''}>
                One number
              </li>
            </ul>
          </div>

          <div className="register-field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <div className="input-shell">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Enter your password again"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                required
                disabled={loading}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword((previous) => !previous)
                }
                aria-label={
                  showConfirmPassword ? 'Hide password' : 'Show password'
                }
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="register-field">
            <label htmlFor="referralCode">
              Referral code <span>(optional)</span>
            </label>
            <input
              id="referralCode"
              name="referralCode"
              type="text"
              placeholder="Enter a referral code"
              value={referralCode}
              onChange={(event) => setReferralCode(event.target.value)}
              disabled={loading}
            />
          </div>

          {message && (
            <p
              className={`register-message ${messageType}`}
              role="alert"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            className="register-submit"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
            {!loading && <span>→</span>}
          </button>
        </form>

        <p className="register-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}