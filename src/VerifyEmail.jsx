
import { Link } from 'react-router-dom'
import logo from './assets/overmaths-logo.png'
import './VerifyEmail.css'

function VerifyEmail() {
  return (
    <div className="verify-page">
      <div className="verify-card">

        <img
          src={logo}
          alt="Overmaths"
          className="verify-logo"
        />

        <div className="verify-icon">
          ✓
        </div>

        <h1>Check Your Email</h1>

        <p className="verify-main-text">
          You're almost ready to start your Overmaths journey.
        </p>

        <p className="verify-description">
          We've sent a verification link to your email address.
          Open your inbox and click the verification link to
          activate your Overmaths account.
        </p>

        <div className="verify-highlight">
          <strong>Why verify your email?</strong>

          <p>
            Email verification helps protect your account and
            ensures that only you can access your Overmaths
            learning experience.
          </p>
        </div>

        <div className="verify-steps">
          <div className="verify-step">
            <span>1</span>
            <p>Open your email inbox.</p>
          </div>

          <div className="verify-step">
            <span>2</span>
            <p>Find the email from Overmaths.</p>
          </div>

          <div className="verify-step">
            <span>3</span>
            <p>Click the verification link.</p>
          </div>
        </div>

        <Link
          to="/login"
          className="verify-login-btn"
        >
          Go to Sign In
        </Link>

        <p className="verify-footer">
          Didn't receive the email? Check your spam or junk folder.
          If you still can't find it, you can request another
          verification email from the sign-in page.
        </p>

        <Link
          to="/register"
          className="verify-back-link"
        >
          ← Back to Sign Up
        </Link>

        <div className="verify-brand">
          <span>Overmaths</span>
          <small>Smart Exam Practice</small>
        </div>

      </div>
    </div>
  )
}

export default VerifyEmail

