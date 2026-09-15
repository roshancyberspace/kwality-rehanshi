import { useState } from 'react'
import ForgotPasswordForm from './ForgotPasswordForm'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'

function AuthModal({ defaultMode = 'login', onClose, onLogin, onOpenBecomeProvider }) {
  const [mode, setMode] = useState(defaultMode)
  const [signupStep, setSignupStep] = useState(1)
  const [isClosing, setIsClosing] = useState(false)
  const isLogin = mode === 'login'
  const isForgotPassword = mode === 'forgot-password'
  const isSignup = mode === 'signup'
  const closeSmoothly = () => {
    setIsClosing(true)
    window.setTimeout(onClose, 180)
  }
  const loginSmoothly = async (user) => {
    await onLogin?.(user)
    setIsClosing(true)
    window.setTimeout(onClose, 180)
  }
  const openBecomeProvider = () => {
    setIsClosing(true)
    window.setTimeout(() => {
      if (onOpenBecomeProvider) {
        onOpenBecomeProvider()
        return
      }

      window.history.pushState({}, '', '/become-service-provider')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, 120)
  }

  return (
    <div className={`fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/65 px-3 py-4 backdrop-blur-md sm:px-4 sm:py-6 ${isClosing ? 'animate-modal-fade-out' : 'animate-modal-fade'}`}>
      <div className={`relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[26.5rem] flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl shadow-slate-900/25 ${isClosing ? 'animate-modal-slide-out' : 'animate-modal-slide'}`}>
        
        {/* Floating Close Button */}
        <button
          className="absolute right-3.5 top-3.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          onClick={closeSmoothly}
          type="button"
          aria-label="Close popup"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="overflow-y-auto px-5 py-3.5 sm:px-6 sm:py-4">
          {/* Organized Brand Header Bar */}
          <div className="mb-3 border-b border-slate-100 pb-2.5 pr-7">
            <div className="flex items-center justify-between">
              <img src="/logo2.png" alt="KwalityCare" className="h-11 sm:h-12 w-auto object-contain shrink-0" />
            </div>
            <div className="mt-2 text-left">
              <h2 className="text-base font-black tracking-tight text-[#0B3B7A]">
                {isForgotPassword
                  ? 'Reset Password'
                  : isLogin
                    ? 'Welcome back!'
                    : signupStep === 1
                      ? 'Create an account'
                      : signupStep === 2
                        ? 'Verify Your Email'
                        : 'Set Account Password'}
              </h2>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                {isForgotPassword
                  ? 'Enter registered email for reset code'
                  : isLogin
                    ? 'Sign in to continue to KwalityCare'
                    : signupStep === 1
                      ? 'Enter your basic details to get started'
                      : signupStep === 2
                        ? 'Enter 6-digit code sent to your email'
                        : 'Create password to complete registration'}
              </p>
            </div>
          </div>

          <div className="mt-2">
            {isForgotPassword ? (
              <ForgotPasswordForm onBackToLogin={() => setMode('login')} />
            ) : isLogin ? (
              <LoginForm
                onCreateAccount={() => {
                  setSignupStep(1)
                  setMode('signup')
                }}
                onForgotPassword={() => setMode('forgot-password')}
                onLogin={loginSmoothly}
                onOpenBecomeProvider={openBecomeProvider}
                compact
              />
            ) : (
              <SignupForm
                onLoginSuccess={loginSmoothly}
                onShowLogin={() => {
                  setSignupStep(1)
                  setMode('login')
                }}
                onStepChange={setSignupStep}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthModal
