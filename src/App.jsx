import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Register from './Register'
import Login from './Login'
import VerifyEmail from './VerifyEmail' 
import ForgotPassword from './ForgotPassword'
import ResetPassword from './ResetPassword'
import StudentProfile from './pages/StudentProfile'
import Dashboard from './pages/Dashboard'







function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />     
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />  
        <Route path="/student-profile" element={<StudentProfile />} />
        <Route path="/dashboard" element={<Dashboard />} /> 
      </Routes>
    </BrowserRouter>
  )
}

export default App