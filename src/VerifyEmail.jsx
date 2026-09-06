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
          Please open your inbox and click the link to activate
          your Overmaths account.
        </p>

        <div className="verify-highlight">
          <strong>Why verify your email?</strong>

          <p>
            Email verification helps us keep your account secure
            and ensures that you can access your Overmaths learning
            experience safely.
          </p>
        </div>

        <Link
          to="/login"
          className="verify-login-btn"
        >
          Go to Sign In
        </Link>

        <p className="verify-footer">
          Didn't receive the email? Check your spam or junk folder.
        </p>

        <div className="verify-brand">
          <span>Overmaths</span>
          <small>Smart Exam Practice</small>
        </div>

      </div>
    </div>
  )
}

export default VerifyEmail